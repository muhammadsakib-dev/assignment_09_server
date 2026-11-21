import { Router } from "express";
import type { Filter } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import {
  ALLOWED_CATEGORIES,
  type VendorServiceDocument,
  type VendorServiceStatus,
  serializeVendorService,
} from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /admin/overview — Live platform counts for Admin Dashboard
router.get(
  "/overview",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (_req, res) => {
    const db = getDB();
    const usersCol = db.collection("user");
    const servicesCol = db.collection("services");
    const transactionsCol = db.collection("transactions");

    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    ] = await Promise.all([
      usersCol.countDocuments({}),
      usersCol.countDocuments({ role: "vendor" }),
      usersCol.countDocuments({
        $or: [
          { role: "user" },
          { role: "customer" },
          { role: { $exists: false } },
        ],
      }),
      servicesCol.countDocuments({}),
      servicesCol.countDocuments({ status: "pending" }),
      transactionsCol.countDocuments({}),
    ]);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin overview stats retrieved successfully.",
      data: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalServices,
        pendingServices,
        totalTransactions,
      },
    });
  }),
);

// GET /admin/users — List all registered users with search & role filter
router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (req, res) => {
    const db = getDB();
    const filter: Record<string, unknown> = {};

    const rawRole =
      typeof req.query.role === "string"
        ? req.query.role.trim().toLowerCase()
        : "";
    if (rawRole === "vendor" || rawRole === "admin") {
      filter.role = rawRole;
    } else if (rawRole === "user" || rawRole === "customer") {
      filter.$or = [
        { role: "user" },
        { role: "customer" },
        { role: { $exists: false } },
      ];
    }

    const rawSearch =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (rawSearch) {
      const regex = new RegExp(escapeRegex(rawSearch), "i");
      const searchCond = [{ name: regex }, { email: regex }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchCond }];
        delete filter.$or;
      } else {
        filter.$or = searchCond;
      }
    }

    const users = await db
      .collection("user")
      .find(filter, {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          isBlocked: 1,
          businessName: 1,
          phone: 1,
          location: 1,
          subscriptionPlan: 1,
          createdAt: 1,
        },
      })
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Users retrieved successfully.",
      data: users.map((u) => ({
        id: String(u._id),
        name: String(u.name || "Unnamed User"),
        email: String(u.email || ""),
        image: typeof u.image === "string" ? u.image : "",
        role:
          u.role === "admin" || u.role === "vendor"
            ? (u.role as "admin" | "vendor")
            : ("user" as const),
        isBlocked: Boolean(u.isBlocked),
        businessName: typeof u.businessName === "string" ? u.businessName : "",
        phone: typeof u.phone === "string" ? u.phone : "",
        location: typeof u.location === "string" ? u.location : "",
        subscriptionPlan: u.subscriptionPlan === "premium" ? "premium" : "free",
        createdAt: u.createdAt
          ? new Date(u.createdAt).toISOString()
          : new Date().toISOString(),
      })),
      meta: { total: users.length },
    });
  }),
);

// GET /admin/services — List all vendor-submitted services with search, status & category filters
router.get(
  "/services",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (req, res) => {
    const db = getDB();
    const filter: Filter<VendorServiceDocument> = {};

    const rawStatus =
      typeof req.query.status === "string"
        ? req.query.status.trim().toLowerCase()
        : "";
    if (
      rawStatus === "pending" ||
      rawStatus === "approved" ||
      rawStatus === "rejected"
    ) {
      filter.status = rawStatus as VendorServiceStatus;
    }

    const rawCategory =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    if (rawCategory && ALLOWED_CATEGORIES.has(rawCategory)) {
      filter.category = rawCategory;
    }

    const rawSearch =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (rawSearch) {
      const regex = new RegExp(escapeRegex(rawSearch), "i");
      filter.$or = [
        { serviceName: regex },
        { vendorName: regex },
        { vendorEmail: regex },
        { location: regex },
      ];
    }

    const services = await db
      .collection<VendorServiceDocument>("services")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "All platform services retrieved successfully.",
      data: services.map(serializeVendorService),
      meta: { total: services.length },
    });
  }),
);

// GET /admin/transactions — Read-only platform payment transactions oversight
router.get(
  "/transactions",
  requireAuth,
  requireRole("admin"),
  catchAsync(async (_req, res) => {
    const db = getDB();
    const transactions = await db
      .collection("transactions")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Transactions retrieved successfully.",
      data: transactions.map((t) => ({
        id: String(t._id),
        vendorId: String(t.vendorId || ""),
        vendorName: String(t.vendorName || "Vendor"),
        vendorEmail: String(t.vendorEmail || ""),
        plan: String(t.plan || "premium"),
        amount: Number(t.amount || 0),
        currency: String(t.currency || "usd"),
        status: String(t.status || "pending"),
        createdAt: t.createdAt
          ? new Date(t.createdAt).toISOString()
          : new Date().toISOString(),
      })),
      meta: { total: transactions.length },
    });
  }),
);

export const readAdminRouter = router;
export default router;
