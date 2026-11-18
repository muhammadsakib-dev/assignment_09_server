import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import {
  type BookingAction,
  type BookingDocument,
  type BookingStatus,
  serializeBooking,
} from "../../types/booking.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

const VALID_ACTIONS = new Set<BookingAction>(["cancel", "approve", "reject"]);

// PATCH /bookings/:id/status — Strict transitions: Customer cancels pending only; Vendor approves (-> booked) or rejects pending only
router.patch(
  "/:id/status",
  requireAuth,
  catchAsync(async (req, res) => {
    const authUser = req.user;
    if (!authUser) {
      sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const bookingId = typeof req.params.id === "string" ? req.params.id : "";
    if (!ObjectId.isValid(bookingId)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid booking ID.",
      });
      return;
    }

    const action =
      typeof req.body?.action === "string"
        ? (req.body.action.trim().toLowerCase() as BookingAction)
        : null;

    if (!action || !VALID_ACTIONS.has(action)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid action. Allowed actions: cancel, approve, reject.",
      });
      return;
    }

    const db = getDB();
    const collection = db.collection<BookingDocument>("bookings");
    const objectId = new ObjectId(bookingId);
    const existing = await collection.findOne({ _id: objectId });

    if (!existing) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Booking not found.",
      });
      return;
    }

    let nextStatus: BookingStatus | null = null;

    if (action === "cancel") {
      if (existing.userEmail !== authUser.email) {
        sendResponse(res, {
          statusCode: 403,
          success: false,
          message: "Only the customer who made this booking can cancel it.",
        });
        return;
      }

      // Per spec: customers can only cancel pending booking requests
      if (existing.status !== "pending") {
        sendResponse(res, {
          statusCode: 400,
          success: false,
          message: `Cannot cancel a booking that is already ${existing.status}.`,
        });
        return;
      }

      nextStatus = "cancelled";
    } else if (action === "approve" || action === "reject") {
      if (
        authUser.role !== "vendor" ||
        existing.vendorEmail !== authUser.email
      ) {
        sendResponse(res, {
          statusCode: 403,
          success: false,
          message: "Only the assigned vendor can approve or reject this booking.",
        });
        return;
      }

      if (existing.status !== "pending") {
        sendResponse(res, {
          statusCode: 400,
          success: false,
          message: `Only pending bookings can be ${action === "approve" ? "approved" : "rejected"}.`,
        });
        return;
      }

      nextStatus = action === "approve" ? "booked" : "rejected";
    }

    if (!nextStatus) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Unsupported booking status transition.",
      });
      return;
    }

    const updatedAt = new Date();
    await collection.updateOne(
      { _id: objectId },
      { $set: { status: nextStatus, updatedAt } },
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        nextStatus === "booked"
          ? "Booking approved and marked as booked."
          : nextStatus === "rejected"
            ? "Booking request rejected."
            : "Booking cancelled successfully.",
      data: serializeBooking({ ...existing, status: nextStatus, updatedAt }),
    });
  }),
);

export const updateBookingRouter = router;
export default router;
