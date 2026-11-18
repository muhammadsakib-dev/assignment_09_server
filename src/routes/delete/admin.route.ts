import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import type { VendorServiceDocument } from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// DELETE /admin/services/:id — Admin deletes an inappropriate or invalid service
router.delete(
  "/services/:id",
  requireAuth,
  requireRole("admin"),
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
    const result = await db
      .collection<VendorServiceDocument>("services")
      .deleteOne({ _id: new ObjectId(serviceId) });

    if (result.deletedCount === 0) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Service not found.",
      });
      return;
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service deleted by administrator.",
    });
  }),
);

export const deleteAdminRouter = router;
export default router;
