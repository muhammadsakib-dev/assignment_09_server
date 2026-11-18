import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../../config/db.js";
import requireAuth from "../../middlewares/requireAuth.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// GET /profile — Return safe projected profile details for the authenticated user
router.get(
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

    const db = getDB();
    const userFilter = ObjectId.isValid(authUser.id)
      ? { $or: [{ _id: new ObjectId(authUser.id) }, { id: authUser.id }] }
      : { id: authUser.id };

    const user = await db.collection("user").findOne(userFilter, {
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

    if (!user) {
      sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "User profile not found.",
      });
      return;
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Profile loaded successfully.",
      data: {
        id: String(user._id),
        name: String(user.name || ""),
        email: String(user.email || ""),
        image: typeof user.image === "string" ? user.image : "",
        role: authUser.role,
        phone: typeof user.phone === "string" ? user.phone : "",
        location: typeof user.location === "string" ? user.location : "",
        businessName:
          typeof user.businessName === "string" ? user.businessName : "",
        subscriptionPlan:
          user.subscriptionPlan === "premium" ? "premium" : "free",
      },
    });
  }),
);

export const readProfileRouter = router;
export default router;
