// Import necessary modules
import { Router } from "express";
import createBookingRouter from "./create/booking.route.js";
import createCheckoutRouter from "./create/checkout.route.js";
import createSavedRouter from "./create/saved.route.js";
import createServiceRouter from "./create/service.route.js";
import createWebhookRouter from "./create/webhook.route.js";
import deleteAdminRouter from "./delete/admin.route.js";
import deleteSavedRouter from "./delete/saved.route.js";
import deleteServiceRouter from "./delete/service.route.js";
import readAdminRouter from "./read/admin.route.js";
import readBookingRouter from "./read/booking.route.js";
import readCheckoutRouter from "./read/checkout.route.js";
import healthRouter from "./read/health.route.js";
import readProfileRouter from "./read/profile.route.js";
import readSavedRouter from "./read/saved.route.js";
import readServiceRouter from "./read/service.route.js";
import uiRouter from "./read/ui.route.js";
import updateAdminRouter from "./update/admin.route.js";
import updateBookingRouter from "./update/booking.route.js";
import updateProfileRouter from "./update/profile.route.js";
import updateServiceRouter from "./update/service.route.js";

const router = Router();

// Root route
router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Assignment 09 API Server is live and running!",
  });
});

// ==========================================
// 1. READ Routes (GET)
// ==========================================
router.use("/health", healthRouter);
router.use("/ui", uiRouter);
router.use("/bookings", readBookingRouter);
router.use("/saved", readSavedRouter);
router.use("/services", readServiceRouter);
router.use("/profile", readProfileRouter);
router.use("/admin", readAdminRouter);
router.use("/checkout", readCheckoutRouter);

// ==========================================
// 2. CREATE Routes (POST)
// ==========================================
router.use("/bookings", createBookingRouter);
router.use("/saved", createSavedRouter);
router.use("/services", createServiceRouter);
router.use("/checkout", createCheckoutRouter);
router.use("/webhook", createWebhookRouter);

// ==========================================
// 3. UPDATE Routes (PUT / PATCH)
// ==========================================
router.use("/bookings", updateBookingRouter);
router.use("/services", updateServiceRouter);
router.use("/profile", updateProfileRouter);
router.use("/admin", updateAdminRouter);

// ==========================================
// 4. DELETE Routes (DELETE)
// ==========================================
router.use("/saved", deleteSavedRouter);
router.use("/services", deleteServiceRouter);
router.use("/admin", deleteAdminRouter);

export default router;
