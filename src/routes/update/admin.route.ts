import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import {
  type VendorServiceDocument,
  type VendorServiceStatus,
  serializeVendorService,
} from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

const MODERATION_STATUSES = new Set<VendorServiceStatus>([
  "approved",
  "rejected",
  "pending",
]);

// PATCH /admin/services/:id/status — Admin approves, rejects, or changes status of a service
router.patch(
  "/services/:id/status",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (req, res) => {
    const serviceId = typeof req.params.id === "string" ? req.params.id : "";
    if (!ObjectId.isValid(serviceId)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid service ID.",
      });
      return;
    }

    const nextStatus =
      typeof req.body?.status === "string"
        ? (req.body.status.trim().toLowerCase() as VendorServiceStatus)
        : null;

    if (!nextStatus || !MODERATION_STATUSES.has(nextStatus)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Status must be approved, rejected, or pending.",
      });
      return;
    }

    const db = getDB();
    const collection = db.collection<VendorServiceDocument>("services");
    const objectId = new ObjectId(serviceId);
    const existing = await collection.findOne({ _id: objectId });

    if (!existing) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Service not found.",
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
      message: `Service marked as ${nextStatus}.`,
      data: serializeVendorService({
        ...existing,
        status: nextStatus,
        updatedAt,
      }),
    });
  }),
);

// PATCH /admin/users/:id/block — Admin blocks or unblocks a user (cannot block self)
router.patch(
  "/users/:id/block",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (req, res) => {
    const authUser = req.user;
    const targetId = typeof req.params.id === "string" ? req.params.id : "";
    if (!ObjectId.isValid(targetId)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid user ID.",
      });
      return;
    }

    if (authUser && targetId === authUser.id) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "You cannot block your own admin account.",
      });
      return;
    }

    if (typeof req.body?.isBlocked !== "boolean") {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "isBlocked boolean value is required.",
      });
      return;
    }

    const isBlocked = req.body.isBlocked;
    const db = getDB();
    const usersCol = db.collection("user");
    const objectId = new ObjectId(targetId);

    const existing = await usersCol.findOne({ _id: objectId });
    if (!existing) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "User not found.",
      });
      return;
    }

    await usersCol.updateOne(
      { _id: objectId },
      { $set: { isBlocked, updatedAt: new Date() } },
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: isBlocked
        ? "User account has been blocked."
        : "User account has been unblocked.",
      data: { id: targetId, isBlocked },
    });
  }),
);

export const updateAdminRouter = router;
export default router;
