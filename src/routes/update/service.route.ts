import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import {
  ALLOWED_CATEGORIES,
  type VendorServiceDocument,
  serializeVendorService,
} from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import {
  buildUserFilter,
  isActivePremiumSubscription,
} from "../../utils/subscription.js";

const router = Router();

const FREE_PLAN_ACTIVE_LIMIT = 3;

// PATCH /services/:id — Update service fields or toggle availability (vendor owner only)
router.patch(
  "/:id",
  requireAuth,
  requireRole("vendor"),
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

    const serviceId = typeof req.params.id === "string" ? req.params.id : "";
    if (!ObjectId.isValid(serviceId)) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid service ID.",
      });
      return;
    }

    const db = getDB();
    const servicesCol = db.collection<VendorServiceDocument>("services");
    const objectId = new ObjectId(serviceId);
    const existing = await servicesCol.findOne({ _id: objectId });

    if (!existing) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Service not found.",
      });
      return;
    }

    if (existing.vendorEmail !== authUser.email) {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "You can only update your own services.",
      });
      return;
    }

    const body = req.body ?? {};
    const updates: Partial<VendorServiceDocument> = {
      updatedAt: new Date(),
    };

    if (typeof body.serviceName === "string" && body.serviceName.trim()) {
      updates.serviceName = body.serviceName.trim();
    }
    if (
      typeof body.category === "string" &&
      ALLOWED_CATEGORIES.has(body.category.trim())
    ) {
      updates.category = body.category.trim();
    }
    if (typeof body.description === "string" && body.description.trim()) {
      updates.description = body.description.trim();
    }
    if (typeof body.location === "string" && body.location.trim()) {
      updates.location = body.location.trim();
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        sendResponse(res, {
          statusCode: 400,
          success: false,
          message: "Price must be a valid non-negative number.",
        });
        return;
      }
      updates.price = price;
    }
    if (Array.isArray(body.images)) {
      const cleanImages = body.images
        .filter((img: unknown): img is string => typeof img === "string")
        .map((img: string) => img.trim())
        .filter((img: string) => img.startsWith("http"))
        .slice(0, 6);
      if (cleanImages.length > 0) {
        updates.images = cleanImages;
      }
    }
    if (Array.isArray(body.highlights)) {
      updates.highlights = body.highlights
        .filter((h: unknown): h is string => typeof h === "string")
        .map((h: string) => h.trim())
        .filter(Boolean)
        .slice(0, 10);
    }
    if (typeof body.isActive === "boolean") {
      if (body.isActive && !existing.isActive) {
        const vendorDoc = await db
          .collection("user")
          .findOne(buildUserFilter(authUser.id, authUser.email), {
            projection: { subscriptionPlan: 1, subscriptionExpiresAt: 1 },
          });

        if (!isActivePremiumSubscription(vendorDoc)) {
          const activeCount = await servicesCol.countDocuments({
            vendorEmail: authUser.email,
            isActive: true,
            status: { $ne: "rejected" },
          });
          if (activeCount >= FREE_PLAN_ACTIVE_LIMIT) {
            sendResponse(res, {
              statusCode: 403,
              success: false,
              message:
                "Free Plan allows up to 3 active services. Pause another listing or upgrade to Premium.",
            });
            return;
          }
        }
      }
      updates.isActive = body.isActive;
    }

    await servicesCol.updateOne({ _id: objectId }, { $set: updates });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service updated successfully.",
      data: serializeVendorService({ ...existing, ...updates }),
    });
  }),
);

export const updateServiceRouter = router;
export default router;
