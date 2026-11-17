// Import necessary modules
import { Router } from "express";
import healthRouter from "./read/health.route.js";
import uiRouter from "./read/ui.route.js";

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

// ==========================================
// 2. CREATE Routes (POST)
// ==========================================
// router.use("/...", createRouter);

// ==========================================
// 3. UPDATE Routes (PUT / PATCH)
// ==========================================
// router.use("/...", updateRouter);

// ==========================================
// 4. DELETE Routes (DELETE)
// ==========================================
// router.use("/...", deleteRouter);

export default router;
