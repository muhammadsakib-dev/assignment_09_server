// Import necessary modules
import { Router } from "express";
import { navbarConfig } from "../../data/ui/navbar.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// Send all UI data in one call: GET /ui
router.get("/", (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All UI data retrieved successfully",
    data: {
      navbar: navbarConfig,
      // Other UI data (e.g. footer, sidebar) can be added here
    },
  });
});

export const uiRouter = router;
export default router;
