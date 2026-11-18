import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import { getStripe } from "../../config/stripe.js";
import requireAuth from "../../middlewares/requireAuth.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// GET /checkout/session/:id — Verify checkout session status
router.get(
  "/session/:id",
  requireAuth,
  catchAsync(async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Session ID parameter is required.",
      });
    }

    const user = req.user;
    if (!user) {
      return sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "Authentication required.",
      });
    }

    const db = getDB();

    // Check if recorded in transactions collection first
    const tx = await db.collection("transactions").findOne({
      stripeSessionId: id,
    });

    if (tx) {
      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Transaction verified successfully.",
        data: {
          sessionId: id,
          status: tx.status,
          plan: tx.plan,
          amount: tx.amount,
          currency: tx.currency,
          createdAt: tx.createdAt
            ? new Date(tx.createdAt).toISOString()
            : new Date().toISOString(),
        },
      });
    }

    // Fallback: Check with Stripe directly if available
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(id);

      if (session.payment_status === "paid") {
        const metadata = session.metadata || {};
        const vendorId = metadata.vendorId || (session.client_reference_id as string);
        const vendorEmail = metadata.vendorEmail || session.customer_email || user.email;
        const vendorName = metadata.vendorName || user.name || "Vendor";
        const plan = metadata.plan || "premium";

        // Sync to MongoDB if webhook was delayed
        if (vendorId) {
          await db.collection("user").updateOne(
            { _id: new ObjectId(vendorId) },
            {
              $set: {
                subscriptionPlan: "premium",
                subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
              },
            },
          );

          await db.collection("transactions").updateOne(
            { stripeSessionId: id },
            {
              $setOnInsert: {
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
              },
            },
            { upsert: true },
          );
        }

        return sendResponse(res, {
          statusCode: 200,
          success: true,
          message: "Payment verified successfully.",
          data: {
            sessionId: id,
            status: "succeeded",
            plan,
            amount: (session.amount_total || 2900) / 100,
            currency: session.currency || "usd",
            createdAt: new Date().toISOString(),
          },
        });
      }

      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Payment status retrieved.",
        data: {
          sessionId: id,
          status: session.payment_status,
          plan: "premium",
          amount: (session.amount_total || 2900) / 100,
          currency: session.currency || "usd",
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Checkout session record not found.",
      });
    }
  }),
);

export const readCheckoutRouter = router;
export default router;
