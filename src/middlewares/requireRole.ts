import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "./requireAuth.js";
import sendResponse from "../utils/sendResponse.js";

export function requireRole(...allowedRoles: AuthenticatedUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
}

export default requireRole;
