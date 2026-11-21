import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import config from "../config/index.js";
import sendResponse from "../utils/sendResponse.js";
import { buildUserFilter } from "../utils/subscription.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "customer" | "vendor" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
}

const SESSION_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
];

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

// Verify HS256 JWT (header.payload.signature) using Node crypto + timingSafeEqual
function verifyHS256Jwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSig] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const sigBuf = Buffer.from(encodedSig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const header = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8"),
    ) as { alg?: string };
    if (header.alg !== "HS256") return null;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as JwtPayload;

    // Reject expired tokens
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function extractSessionCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(";");
  for (const name of SESSION_COOKIE_NAMES) {
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (trimmed.startsWith(`${name}=`)) {
        return trimmed.slice(name.length + 1);
      }
    }
  }
  return null;
}

// Verify Better Auth's HMAC-SHA256 signed session cookie (<token>.<base64Signature>)
function verifySignedCookie(
  rawCookieValue: string,
  secret: string,
): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawCookieValue);
  } catch {
    return null;
  }

  const dotIndex = decoded.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const token = decoded.slice(0, dotIndex);
  const signature = decoded.slice(dotIndex + 1);
  if (!token || !signature) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("base64");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;

  return crypto.timingSafeEqual(sigBuf, expBuf) ? token : null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!config.authSecret) {
      sendResponse(res, {
        statusCode: 500,
        success: false,
        message: "Server authentication secret is not configured.",
      });
      return;
    }

    const db = getDB();
    let resolvedUserId: string | null = null;
    let resolvedEmail: string | null = null;

    // 1. Primary path: Verify Bearer JWT in Authorization header
    const bearerToken = extractBearerToken(req.headers.authorization);
    if (bearerToken) {
      const payload = verifyHS256Jwt(bearerToken, config.authSecret);
      if (!payload?.sub) {
        sendResponse(res, {
          statusCode: 401,
          success: false,
          message: "Invalid or expired authentication token.",
        });
        return;
      }
      resolvedUserId = String(payload.sub);
      if (payload.email) {
        resolvedEmail = String(payload.email).trim().toLowerCase();
      }
    } else {
      // 2. Fallback path: Verify Better Auth signed session cookie
      const rawCookie = extractSessionCookie(req.headers.cookie);
      if (!rawCookie) {
        sendResponse(res, {
          statusCode: 401,
          success: false,
          message: "Authentication required. Please sign in.",
        });
        return;
      }

      const sessionToken = verifySignedCookie(rawCookie, config.authSecret);
      if (!sessionToken) {
        sendResponse(res, {
          statusCode: 401,
          success: false,
          message: "Invalid authentication session.",
        });
        return;
      }

      const session = await db
        .collection("session")
        .findOne({ token: sessionToken });

      if (
        !session ||
        !session.expiresAt ||
        new Date(session.expiresAt) <= new Date()
      ) {
        sendResponse(res, {
          statusCode: 401,
          success: false,
          message: "Session expired. Please sign in again.",
        });
        return;
      }

      resolvedUserId = String(session.userId);
    }

    // Always look up live user record from MongoDB to enforce current role & isBlocked status
    const userQuery = buildUserFilter(resolvedUserId, resolvedEmail);

    const user = await db.collection("user").findOne(userQuery, {
      projection: { _id: 1, id: 1, name: 1, email: 1, role: 1, isBlocked: 1 },
    });

    const finalEmail = user?.email
      ? String(user.email).trim().toLowerCase()
      : resolvedEmail;

    if (!user || !finalEmail) {
      sendResponse(res, {
        statusCode: 401,
        success: false,
        message: "User account not found.",
      });
      return;
    }

    if (user.isBlocked === true) {
      sendResponse(res, {
        statusCode: 403,
        success: false,
        message: "Account is blocked. Access denied.",
      });
      return;
    }

    const normalizedRole: AuthenticatedUser["role"] =
      user.role === "admin" ||
      user.role === "vendor" ||
      user.role === "customer"
        ? user.role
        : "user";

    req.user = {
      id: user._id ? String(user._id) : String(user.id),
      name: String(user.name || "User"),
      email: String(user.email).trim().toLowerCase(),
      role: normalizedRole,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export default requireAuth;
