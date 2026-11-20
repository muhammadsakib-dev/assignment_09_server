import { Router } from "express";
import type Stripe from "stripe";
import { getDB } from "../../config/db.js";
import config from "../../config/index.js";
import { getStripe } from "../../config/stripe.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import {
  buildUserFilter,
  isActivePremiumSubscription,
  PREMIUM_PLANS,
  resolveBillingCycle,
} from "../../utils/subscription.js";

const router = Router();

// POST /checkout/create-session — Initiate Stripe Checkout strictly for authenticated Vendors
router.post(
  "/create-session",
  requireAuth,
  requireRole("vendor"),
  catchAsync(async (req, res) => {
    const user = req.user;
    if (!user) {
      sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const db = getDB();
    const userDoc = await db.collection("user").findOne(
      buildUserFilter(user.id, user.email),
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          isBlocked: 1,
          subscriptionPlan: 1,
          subscriptionExpiresAt: 1,
        },
      },
    );

    if (!userDoc) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Vendor account record not found.",
      });
      return;
    }

    if (userDoc.isBlocked) {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "Your vendor account is blocked. Contact platform support.",
      });
      return;
    }

    if (isActivePremiumSubscription(userDoc)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "You already have an active Premium Vendor subscription.",
      });
      return;
    }

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch {
      sendResponse(res, {
        statusCode: 503,
        success: false,
        message:
          "Stripe payment gateway is not configured yet. Please set STRIPE_SECRET_KEY in the server .env file.",
      });
      return;
    }

    const billingCycle = resolveBillingCycle(req.body?.billingCycle);
    const planConfig = PREMIUM_PLANS[billingCycle];
    const baseClientUrl = config.clientUrl.replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planConfig.name,
              description: planConfig.description,
            },
            unit_amount: planConfig.unitAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        vendorId: user.id,
        vendorEmail: user.email,
        vendorName: user.name || "Vendor",
        plan: "premium",
        billingCycle,
      },
      success_url: `${baseClientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseClientUrl}/payment/cancel`,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Stripe checkout session initialized successfully.",
      data: {
        id: session.id,
        url: session.url,
      },
    });
  }),
);

export const createCheckoutRouter = router;
export default router;
