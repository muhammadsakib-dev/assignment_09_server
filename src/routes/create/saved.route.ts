import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import {
  type SavedServiceDocument,
  serializeSavedService,
} from "../../types/saved.js";
import type { VendorServiceDocument } from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// POST /saved — Save a verified MongoDB wedding service to the authenticated customer's favorites
router.post(
  "/",
  requireAuth,
  requireRole("user"),
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

    const serviceId =
      typeof req.body?.serviceId === "string" ? req.body.serviceId.trim() : "";

    if (!ObjectId.isValid(serviceId)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Valid service ID is required to save.",
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
        message: "Service not found or unavailable.",
      });
      return;
    }

    const collection = db.collection<SavedServiceDocument>("savedServices");
    const existing = await collection.findOne({
      userEmail: authUser.email,
      serviceId,
    });

    if (existing) {
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Service is already saved.",
        data: serializeSavedService(existing),
      });
      return;
    }

    const doc: SavedServiceDocument = {
      userId: authUser.id,
      userEmail: authUser.email,
      serviceId,
      serviceName: service.serviceName,
      serviceCategory: service.category,
      serviceImage: service.images[0] || "",
      price: service.price,
      location: service.location,
      vendorName: service.vendorName,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(doc);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Service saved to favorites.",
      data: serializeSavedService({ ...doc, _id: result.insertedId }),
    });
  }),
);

export const createSavedRouter = router;
export default router;
