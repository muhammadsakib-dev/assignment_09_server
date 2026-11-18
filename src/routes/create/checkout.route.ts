import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import config from "../../config/index.js";
import { getStripe } from "../../config/stripe.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// POST /checkout/create-session — Initiate Stripe Checkout for Vendor Premium upgrade
router.post(
  "/create-session",
  requireAuth,
  requireRole("vendor"),
  catchAsync(async (req, res) => {
    const user = req.user;
    if (!user) {
      return sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "Authentication required.",
      });
    }

    const db = getDB();
    const userDoc = await db
      .collection("user")
      .findOne({ _id: new ObjectId(user.id) });

    if (!userDoc) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Vendor account record not found.",
      });
    }

    if (userDoc.isBlocked) {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "Your vendor account is blocked. Contact platform support.",
      });
    }

    if (userDoc.subscriptionPlan === "premium") {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "You already have an active Premium Vendor subscription.",
      });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return sendResponse(res, {
        statusCode: 503,
        success: false,
        message:
          "Stripe payments are not configured on this server. Please add STRIPE_SECRET_KEY to server .env.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "WedPlan Premium Vendor Plan",
              description:
                "Unlimited active wedding services, verified badge, and priority search placement.",
            },
            unit_amount: 2900, // $29.00 USD
          },
          quantity: 1,
        },
      ],
      metadata: {
        vendorId: user.id,
        vendorEmail: user.email,
        vendorName: user.name || "Vendor",
        plan: "premium",
      },
      success_url: `${config.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.clientUrl}/payment/cancel`,
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
