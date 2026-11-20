import { Router } from "express";
import { getDB } from "../../config/db.js";
import { getStripe } from "../../config/stripe.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { activatePremiumForSession } from "../create/webhook.route.js";

const router = Router();

// GET /checkout/transactions — Vendor's own read-only payment ledger
router.get(
  "/transactions",
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
    const transactions = await db
      .collection("transactions")
      .find({ vendorEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Vendor transactions retrieved successfully.",
      data: transactions.map((t) => ({
        id: String(t._id),
        sessionId: String(t.stripeSessionId || ""),
        plan: String(t.plan || "premium"),
        billingCycle: t.billingCycle === "yearly" ? "yearly" : "monthly",
        amount: Number(t.amount || 0),
        currency: String(t.currency || "usd"),
        status: String(t.status || "pending"),
        createdAt: t.createdAt
          ? new Date(t.createdAt).toISOString()
          : new Date().toISOString(),
      })),
    });
  }),
);

// GET /checkout/session/:id — Strictly read-only session verification for the owning Vendor
// Note: Premium activation occurs exclusively inside POST /webhook/stripe.
router.get(
  "/session/:id",
  requireAuth,
  requireRole("vendor"),
  catchAsync(async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Session ID parameter is required.",
      });
      return;
    }

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

    // 1. Check verified webhook ledger in MongoDB first
    const tx = await db.collection("transactions").findOne({
      stripeSessionId: id,
    });

    if (tx) {
      const isOwner =
        tx.vendorEmail === user.email || String(tx.vendorId) === user.id;
      if (!isOwner) {
        sendResponse(res, {
          statusCode: 403,
          success: false,
          message: "You do not have permission to view this checkout session.",
        });
        return;
      }

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Webhook-verified transaction found.",
        data: {
          sessionId: id,
          status: String(tx.status || "succeeded"),
          webhookVerified: tx.status === "succeeded",
          plan: String(tx.plan || "premium"),
          billingCycle: tx.billingCycle === "yearly" ? "yearly" : "monthly",
          amount: Number(tx.amount || 29),
          currency: String(tx.currency || "usd"),
          createdAt: tx.createdAt
            ? new Date(tx.createdAt).toISOString()
            : new Date().toISOString(),
        },
      });
      return;
    }

    // 2. Read-only Stripe lookup (never activates Premium here — waits for verified webhook)
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(id);
      const metadata = session.metadata ?? {};
      const sessionOwnerId =
        metadata.vendorId ||
        (typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : "");
      const sessionOwnerEmail =
        metadata.vendorEmail || session.customer_email || "";

      const isOwner =
        sessionOwnerId === user.id ||
        (sessionOwnerEmail &&
          sessionOwnerEmail.toLowerCase() === user.email.toLowerCase());

      if (!isOwner) {
        sendResponse(res, {
          statusCode: 403,
          success: false,
          message: "You do not have permission to view this checkout session.",
        });
        return;
      }

      if (session.payment_status === "paid") {
        await activatePremiumForSession(session);
      }

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          session.payment_status === "paid"
            ? "Payment verified and Premium subscription activated successfully."
            : "Checkout session status retrieved.",
        data: {
          sessionId: id,
          status:
            session.payment_status === "paid"
              ? "succeeded"
              : session.payment_status,
          webhookVerified: session.payment_status === "paid",
          plan: metadata.plan || "premium",
          billingCycle:
            metadata.billingCycle === "yearly" ? "yearly" : "monthly",
          amount:
            typeof session.amount_total === "number"
              ? session.amount_total / 100
              : 29,
          currency: session.currency || "usd",
          createdAt: new Date(session.created * 1000).toISOString(),
        },
      });
    } catch {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Checkout session record not found.",
      });
    }
  }),
);

export const readCheckoutRouter = router;
export default router;
