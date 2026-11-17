// Import necessary modules
import { Router } from "express";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// Health check endpoint: GET /health
router.get("/", (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Server is healthy and running",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

export const healthRouter = router;
export default router;
