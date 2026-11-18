import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import requireRole from "../../middlewares/requireRole.js";
import type { VendorServiceDocument } from "../../types/service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// DELETE /services/:id — Delete a vendor's own service from MongoDB
router.delete(
  "/:id",
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
    const servicesCol = db.collection<VendorServiceDocument>("services");
    const objectId = new ObjectId(serviceId);
    const existing = await servicesCol.findOne({ _id: objectId });

    if (!existing) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Service not found.",
      });
      return;
    }

    if (existing.vendorEmail !== authUser.email) {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "You can only delete your own services.",
      });
      return;
    }

    await servicesCol.deleteOne({ _id: objectId });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service deleted successfully.",
    });
  }),
);

export const deleteServiceRouter = router;
export default router;
