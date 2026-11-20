import { Router } from "express";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { buildUserFilter } from "../../utils/subscription.js";

const router = Router();

// PATCH /profile — Update whitelisted editable profile fields only (never role or subscriptionPlan)
router.patch(
  "/",
  requireAuth,
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

    const body = req.body ?? {};
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.name === "string") {
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2) {
        sendResponse(res, {
          statusCode: 400,
          success: false,
          message: "Name must be at least 2 characters long.",
        });
        return;
      }
      updates.name = trimmedName;
    }

    if (typeof body.image === "string") {
      const trimmedImage = body.image.trim();
      if (trimmedImage && !trimmedImage.startsWith("http")) {
        sendResponse(res, {
          statusCode: 400,
          success: false,
          message: "Profile image must be a valid HTTP/HTTPS URL.",
        });
        return;
      }
      updates.image = trimmedImage;
    }

    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim().slice(0, 30);
    }

    if (typeof body.location === "string") {
      updates.location = body.location.trim().slice(0, 120);
    }

    if (authUser.role === "vendor" && typeof body.businessName === "string") {
      updates.businessName = body.businessName.trim().slice(0, 120);
    }

    const db = getDB();
    const userFilter = buildUserFilter(authUser.id, authUser.email);

    await db.collection("user").updateOne(userFilter, { $set: updates });

    const updated = await db.collection("user").findOne(userFilter, {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        image: 1,
        role: 1,
        phone: 1,
        location: 1,
        businessName: 1,
        subscriptionPlan: 1,
      },
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Profile updated successfully.",
      data: updated
        ? {
            id: String(updated._id),
            name: String(updated.name || ""),
            email: String(updated.email || ""),
            image: typeof updated.image === "string" ? updated.image : "",
            role: authUser.role,
            phone: typeof updated.phone === "string" ? updated.phone : "",
            location:
              typeof updated.location === "string" ? updated.location : "",
            businessName:
              typeof updated.businessName === "string"
                ? updated.businessName
                : "",
            subscriptionPlan:
              updated.subscriptionPlan === "premium" ? "premium" : "free",
          }
        : undefined,
    });
  }),
);

export const updateProfileRouter = router;
export default router;
