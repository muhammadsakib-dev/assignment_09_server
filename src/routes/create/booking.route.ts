import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import {
  type BookingDocument,
  serializeBooking,
} from "../../types/booking.js";
import type { VendorServiceDocument } from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// POST /bookings — Authenticated customers create a new booking verified against real MongoDB services
router.post(
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

    if (authUser.role === "admin") {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "Admins cannot submit customer booking requests.",
      });
      return;
    }

    const body = req.body ?? {};
    const serviceId =
      typeof body.serviceId === "string" ? body.serviceId.trim() : "";
    const eventDate =
      typeof body.eventDate === "string" ? body.eventDate.trim() : "";
    const eventLocation =
      typeof body.eventLocation === "string" ? body.eventLocation.trim() : "";
    const guestCount = Number(body.guestCount ?? 100);
    const rawMessage =
      typeof body.message === "string"
        ? body.message
        : typeof body.notes === "string"
          ? body.notes
          : "";
    const message = rawMessage.trim().slice(0, 1000);

    if (
      !ObjectId.isValid(serviceId) ||
      !DATE_REGEX.test(eventDate) ||
      !eventLocation ||
      !Number.isFinite(guestCount) ||
      guestCount < 1
    ) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message:
          "Please provide a valid service ID, event date, event location, and guest count.",
      });
      return;
    }

    const db = getDB();
    const service = await db
      .collection<VendorServiceDocument>("services")
      .findOne({
        _id: new ObjectId(serviceId),
        status: "approved",
        isActive: true,
      });

    if (!service) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Service not found or is not available for booking.",
      });
      return;
    }

    // Prevent vendors from booking their own services
    if (
      service.vendorEmail === authUser.email ||
      service.vendorId === authUser.id
    ) {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "Vendors cannot book their own services.",
      });
      return;
    }

    // Prevent duplicate active booking requests for the same service and event date
    const bookingsCol = db.collection<BookingDocument>("bookings");
    const duplicate = await bookingsCol.findOne({
      userEmail: authUser.email,
      serviceId,
      eventDate,
      status: { $in: ["pending", "booked"] },
    });

    if (duplicate) {
      sendResponse(res, {
        statusCode: 409,
        success: false,
        message:
          "You already have an active booking request for this service on the selected date.",
      });
      return;
    }

    const now = new Date();
    const newBooking: BookingDocument = {
      serviceId,
      serviceName: service.serviceName,
      serviceCategory: service.category,
      serviceImage: service.images[0] || "",
      price: service.price,
      location: service.location,
      customerId: authUser.id,
      userId: authUser.id,
      userName: authUser.name,
      userEmail: authUser.email,
      vendorId: service.vendorId,
      vendorName: service.vendorName,
      vendorEmail: service.vendorEmail,
      eventDate,
      eventLocation,
      guestCount: Math.round(guestCount),
      message,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const result = await bookingsCol.insertOne(newBooking);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Booking request submitted successfully.",
      data: serializeBooking({ ...newBooking, _id: result.insertedId }),
    });
  }),
);

export const createBookingRouter = router;
export default router;
