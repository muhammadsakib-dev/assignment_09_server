import { Router } from "express";
import sendResponse from "../../utils/sendResponse.js";

const router = Router();

// Reserved for secure/dynamic backend UI data (GET /ui)
router.get("/", (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "UI endpoint ready",
    data: {},
  });
});

export const uiRouter = router;
export default router;
