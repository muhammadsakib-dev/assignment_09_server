import { Router } from "express";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import { getDB } from "../../config/db.js";
import config from "../../config/index.js";
import { getStripe } from "../../config/stripe.js";
import catchAsync from "../../utils/catchAsync.js";
import {
  buildUserFilter,
  PREMIUM_PLANS,
  resolveBillingCycle,
} from "../../utils/subscription.js";

const router = Router();

async function activatePremiumForSession(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const vendorId =
    metadata.vendorId ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : "");
  const vendorEmail = (
    metadata.vendorEmail ||
    session.customer_email ||
    ""
  ).trim();
  const vendorName = metadata.vendorName || "Vendor";
  const plan = metadata.plan || "premium";
  const billingCycle = resolveBillingCycle(metadata.billingCycle);
  const planConfig = PREMIUM_PLANS[billingCycle];

  if (!vendorId) {
    return;
  }

  const db = getDB();
  const userFilter = buildUserFilter(vendorId, vendorEmail);
  const userDoc = await db.collection("user").findOne(userFilter, {
    projection: { _id: 1, role: 1, email: 1, name: 1 },
  });

  // Strictly enforce that only vendor accounts can receive Premium activation
  if (!userDoc || userDoc.role !== "vendor") {
    return;
  }

  const resolvedEmail =
    typeof userDoc.email === "string" && userDoc.email
      ? userDoc.email
      : vendorEmail;
  const resolvedName =
    typeof userDoc.name === "string" && userDoc.name
      ? userDoc.name
      : vendorName;
  const expiresAt = new Date(
    Date.now() + planConfig.durationDays * 24 * 60 * 60 * 1000,
  );
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : "";
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : "";

  // 1. Activate Premium subscription on vendor account
  await db.collection("user").updateOne(userFilter, {
    $set: {
      subscriptionPlan: "premium",
      subscriptionExpiresAt: expiresAt,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
      updatedAt: new Date(),
    },
  });

  // 2. Reflect Premium Vendor Badge across all of this vendor's services
  if (resolvedEmail) {
    await db.collection("services").updateMany(
      { vendorEmail: resolvedEmail },
      {
        $set: {
          vendorIsPremium: true,
          updatedAt: new Date(),
        },
      },
    );
  }

  // 3. Record verified transaction idempotently
  const storedVendorId = ObjectId.isValid(vendorId)
    ? new ObjectId(vendorId)
    : vendorId;

  await db.collection("transactions").updateOne(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        vendorId: storedVendorId,
        vendorName: resolvedName,
        vendorEmail: resolvedEmail,
        plan,
        billingCycle,
        amount:
          typeof session.amount_total === "number"
            ? session.amount_total / 100
            : planConfig.amountUsd,
        currency: session.currency || "usd",
        stripeSessionId: session.id,
        stripeSubscriptionId,
        status: "succeeded",
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

async function recordUnsuccessfulSession(
  session: Stripe.Checkout.Session,
  status: "failed" | "expired",
) {
  const metadata = session.metadata ?? {};
  const vendorId =
    metadata.vendorId ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : "");
  if (!vendorId) {
    return;
  }

  const billingCycle = resolveBillingCycle(metadata.billingCycle);
  const planConfig = PREMIUM_PLANS[billingCycle];
  const storedVendorId = ObjectId.isValid(vendorId)
    ? new ObjectId(vendorId)
    : vendorId;

  const db = getDB();
  await db.collection("transactions").updateOne(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        vendorId: storedVendorId,
        vendorName: metadata.vendorName || "Vendor",
        vendorEmail: metadata.vendorEmail || session.customer_email || "",
        plan: metadata.plan || "premium",
        billingCycle,
        amount:
          typeof session.amount_total === "number"
            ? session.amount_total / 100
            : planConfig.amountUsd,
        currency: session.currency || "usd",
        stripeSessionId: session.id,
        stripeSubscriptionId:
          typeof session.subscription === "string" ? session.subscription : "",
        status,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

// POST /webhook/stripe — Cryptographically verified Stripe webhook listener
router.post(
  "/stripe",
  catchAsync(async (req, res) => {
    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch {
      res.status(503).json({
        success: false,
        message: "Stripe is not configured on this server.",
      });
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string" || !sig) {
      res.status(400).json({
        success: false,
        message: "Missing stripe-signature header.",
      });
      return;
    }

    const webhookSecret = config.stripeWebhookSecret;
    if (!webhookSecret) {
      res.status(500).json({
        success: false,
        message: "STRIPE_WEBHOOK_SECRET is not configured on server.",
      });
      return;
    }

    if (!req.rawBody) {
      res.status(400).json({
        success: false,
        message: "Raw request payload unavailable for signature verification.",
      });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid webhook signature.";
      console.error("Stripe webhook verification failed:", errorMessage);
      res.status(400).json({
        success: false,
        message: `Webhook signature verification failed: ${errorMessage}`,
      });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          await activatePremiumForSession(session);
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await activatePremiumForSession(session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await recordUnsuccessfulSession(session, "failed");
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await recordUnsuccessfulSession(session, "expired");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const db = getDB();
        const vendor = await db.collection("user").findOne(
          { stripeSubscriptionId: subscription.id },
          { projection: { _id: 1, email: 1 } },
        );

        if (vendor) {
          await db.collection("user").updateOne(
            { _id: vendor._id },
            {
              $set: {
                subscriptionPlan: "free",
                subscriptionExpiresAt: null,
                updatedAt: new Date(),
              },
            },
          );

          if (typeof vendor.email === "string" && vendor.email) {
            await db.collection("services").updateMany(
              { vendorEmail: vendor.email },
              {
                $set: {
                  vendorIsPremium: false,
                  updatedAt: new Date(),
                },
              },
            );
          }
        }
        break;
      }

      default:
        break;
    }

    res.status(200).json({ received: true });
  }),
);

export const createWebhookRouter = router;
export default router;
