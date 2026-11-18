import { Router } from "express";
import { type Filter, ObjectId, type Sort } from "mongodb";
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

const router = Router();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /services/mine — Must be declared before /:id so "mine" is not treated as an ID
router.get(
  "/mine",
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

    const db = getDB();
    const services = await db
      .collection<VendorServiceDocument>("services")
      .find({ vendorEmail: authUser.email })
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Vendor services retrieved successfully.",
      data: services.map(serializeVendorService),
      meta: { total: services.length },
    });
  }),
);

// GET /services — Public listing of approved & active wedding services from MongoDB
router.get(
  "/",
  catchAsync(async (req, res) => {
    const db = getDB();
    const collection = db.collection<VendorServiceDocument>("services");

    const filter: Filter<VendorServiceDocument> = {
      status: "approved",
      isActive: true,
    };

    const rawCategory =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    if (rawCategory && ALLOWED_CATEGORIES.has(rawCategory)) {
      filter.category = rawCategory;
    }

    const rawLocation =
      typeof req.query.location === "string" ? req.query.location.trim() : "";
    if (rawLocation && rawLocation !== "All Locations") {
      filter.location = new RegExp(`^${escapeRegex(rawLocation)}$`, "i");
    }

    const rawSearch =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (rawSearch) {
      const safeRegex = new RegExp(escapeRegex(rawSearch), "i");
      filter.$or = [
        { serviceName: safeRegex },
        { category: safeRegex },
        { location: safeRegex },
        { vendorName: safeRegex },
      ];
    }

    const rawSort =
      typeof req.query.sort === "string" ? req.query.sort.trim() : "newest";
    let sort: Sort = { vendorIsPremium: -1, createdAt: -1 };
    if (rawSort === "price-asc") {
      sort = { price: 1 };
    } else if (rawSort === "price-desc") {
      sort = { price: -1 };
    }

    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100
        ? Math.floor(rawLimit)
        : 0;

    let cursor = collection.find(filter).sort(sort);
    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const [services, categoryAgg] = await Promise.all([
      cursor.toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { status: "approved", isActive: true } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const categoryCounts: Record<string, number> = {};
    for (const entry of categoryAgg) {
      if (entry._id) {
        categoryCounts[entry._id] = entry.count;
      }
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Approved wedding services retrieved successfully.",
      data: services.map(serializeVendorService),
      meta: {
        total: services.length,
        categoryCounts,
      },
    });
  }),
);

// GET /services/:id — Single approved & active service by MongoDB ObjectId
router.get(
  "/:id",
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
        message: "Wedding service not found or not currently available.",
      });
      return;
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service retrieved successfully.",
      data: serializeVendorService(service),
    });
  }),
);

export const readServiceRouter = router;
export default router;
