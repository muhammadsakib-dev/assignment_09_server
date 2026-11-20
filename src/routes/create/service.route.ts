import { Router } from "express";
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

// POST /services — Vendors create a new wedding service (status defaults to pending; Free Plan max 3 active)
router.post(
  "/",
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

    const body = req.body ?? {};
    const serviceName =
      typeof body.serviceName === "string" ? body.serviceName.trim() : "";
    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const location =
      typeof body.location === "string" ? body.location.trim() : "";
    const price = Number(body.price);

    const images: string[] = Array.isArray(body.images)
      ? body.images
          .filter((img: unknown): img is string => typeof img === "string")
          .map((img: string) => img.trim())
          .filter((img: string) => img.startsWith("http"))
          .slice(0, 6)
      : [];

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights
          .filter((h: unknown): h is string => typeof h === "string")
          .map((h: string) => h.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    if (
      !serviceName ||
      !ALLOWED_CATEGORIES.has(category) ||
      !description ||
      !location ||
      !Number.isFinite(price) ||
      price < 0 ||
      images.length === 0
    ) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message:
          "Please fill in all required service fields including a valid category, price, and at least one image URL.",
      });
      return;
    }

    const db = getDB();
    const vendorDoc = await db
      .collection("user")
      .findOne(buildUserFilter(authUser.id, authUser.email), {
        projection: {
          subscriptionPlan: 1,
          subscriptionExpiresAt: 1,
          businessName: 1,
          name: 1,
          phone: 1,
        },
      });

    const isPremium = isActivePremiumSubscription(vendorDoc);
    const servicesCol = db.collection<VendorServiceDocument>("services");

    // Enforce Free Plan 3-active-service cap on the server
    if (!isPremium) {
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
            "Free Plan allows up to 3 active services. Upgrade to Premium to publish unlimited services.",
        });
        return;
      }
    }

    const now = new Date();
    const doc: VendorServiceDocument = {
      serviceName,
      category,
      description,
      price,
      location,
      images,
      highlights,
      status: "pending",
      isActive: true,
      vendorId: authUser.id,
      vendorName: String(vendorDoc?.businessName || authUser.name),
      vendorEmail: authUser.email,
      vendorPhone: typeof vendorDoc?.phone === "string" ? vendorDoc.phone : "",
      vendorIsPremium: isPremium,
      createdAt: now,
      updatedAt: now,
    };

    const result = await servicesCol.insertOne(doc);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Service submitted to MongoDB for admin approval.",
      data: serializeVendorService({ ...doc, _id: result.insertedId }),
    });
  }),
);

export const createServiceRouter = router;
export default router;
