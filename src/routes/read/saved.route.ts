import { Router } from "express";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import {
  type SavedServiceDocument,
  serializeSavedService,
} from "../../types/saved.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// GET /saved — List all saved wedding services for the authenticated customer
router.get(
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

    const db = getDB();
    const items = await db
      .collection<SavedServiceDocument>("savedServices")
      .find({ userEmail: authUser.email })
      .sort({ createdAt: -1 })
      .toArray();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Saved services retrieved successfully.",
      data: items.map(serializeSavedService),
      meta: { total: items.length },
    });
  }),
);

export const readSavedRouter = router;
export default router;
