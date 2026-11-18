import { Router } from "express";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import { getDB } from "../../config/db.js";
import config from "../../config/index.js";
import { getStripe } from "../../config/stripe.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

// POST /webhook/stripe — Secure cryptographic Stripe webhook listener
router.post(
  "/stripe",
  catchAsync(async (req, res) => {
    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch {
      return res.status(503).json({
        success: false,
        message: "Stripe is not configured on this server.",
      });
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      return res.status(400).json({
        success: false,
        message: "Missing stripe-signature header.",
      });
    }

    const webhookSecret = config.stripeWebhookSecret;
    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        message: "STRIPE_WEBHOOK_SECRET is not configured on server.",
      });
    }

    let event: Stripe.Event;
    const rawPayload = (req as any).rawBody || req.body;

    try {
      event = stripe.webhooks.constructEvent(rawPayload, sig, webhookSecret);
    } catch (err: any) {
      console.error("Stripe webhook verification failed:", err?.message);
      return res.status(400).json({
        success: false,
        message: `Webhook signature verification failed: ${err?.message}`,
      });
    }

    // Handle checkout session completion
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const vendorId = metadata.vendorId || (session.client_reference_id as string);
      const vendorEmail = metadata.vendorEmail || session.customer_email || "";
      const vendorName = metadata.vendorName || "Vendor";
      const plan = metadata.plan || "premium";

      if (vendorId && session.payment_status === "paid") {
        const db = getDB();

        // 1. Update vendor subscription status in user collection
        await db.collection("user").updateOne(
          { _id: new ObjectId(vendorId) },
          {
            $set: {
              subscriptionPlan: "premium",
              subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              updatedAt: new Date(),
            },
          },
        );

        // 2. Insert transaction record idempotently
        const existingTx = await db
          .collection("transactions")
          .findOne({ stripeSessionId: session.id });

        if (!existingTx) {
          await db.collection("transactions").insertOne({
            vendorId: new ObjectId(vendorId),
            vendorName,
            vendorEmail,
            plan,
            amount: (session.amount_total || 2900) / 100,
            currency: session.currency || "usd",
            stripeSessionId: session.id,
            stripeSubscriptionId: (session.subscription as string) || "",
            status: "succeeded",
            createdAt: new Date(),
          });
        }
      }
    }

    res.status(200).json({ received: true });
  }),
);

export const createWebhookRouter = router;
export default router;
