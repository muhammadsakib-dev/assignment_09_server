import { Router } from "express";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import type { SavedServiceDocument } from "../../types/saved.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// DELETE /saved/:serviceId — Remove a saved service for the authenticated customer
router.delete(
  "/:serviceId",
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
      typeof req.params.serviceId === "string"
        ? req.params.serviceId.trim()
        : "";

    if (!serviceId) {
      sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Service ID is required.",
      });
      return;
    }

    const db = getDB();
    await db.collection<SavedServiceDocument>("savedServices").deleteOne({
      userEmail: authUser.email,
      serviceId,
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Removed from saved services.",
    });
  }),
);

export const deleteSavedRouter = router;
export default router;
