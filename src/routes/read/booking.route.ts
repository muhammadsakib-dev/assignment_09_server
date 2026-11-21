import { Router } from "express";
import type { Filter } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import {
  type BookingDocument,
  type BookingStatus,
  serializeBooking,
} from "../../types/booking.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

const VALID_STATUSES = new Set<BookingStatus>([
  "pending",
  "booked",
  "cancelled",
  "rejected",
]);

// GET /bookings — Role-scoped listing from MongoDB (customer by userEmail, vendor by vendorEmail, admin sees all)
router.get(
  "/",
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

    const filter: Filter<BookingDocument> = {};

    if (authUser.role === "vendor") {
      filter.vendorEmail = authUser.email;
    } else if (authUser.role === "user" || authUser.role === "customer") {
      filter.userEmail = authUser.email;
    }

    // Optional validated status filter
    const rawStatus =
      typeof req.query.status === "string"
        ? req.query.status.trim().toLowerCase()
        : "";
    if (rawStatus && VALID_STATUSES.has(rawStatus as BookingStatus)) {
      filter.status = rawStatus as BookingStatus;
    }

    const db = getDB();
    const bookings = await db
      .collection<BookingDocument>("bookings")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Bookings retrieved successfully.",
      data: bookings.map(serializeBooking),
      meta: {
        total: bookings.length,
      },
    });
  }),
);

export const readBookingRouter = router;
export default router;
