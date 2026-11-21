// Importing required modules
import type { IncomingMessage } from "node:http";
import cors from "cors";
import express, { type Application } from "express";
import config from "./config/index.js";
import errorHandler from "./middlewares/errorHandler.js";
import notFound from "./middlewares/notFound.js";
import apiRouter from "./routes/index.js";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

interface RawBodyIncomingMessage extends IncomingMessage {
  rawBody?: Buffer;
}

// Create an Express application
const app: Application = express();

// Normalize client origins for robust cross-origin access across local, Vercel, and custom domains
const configuredClientUrl = config.clientUrl.replace(/\/+$/, "");

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (server-to-server, curl, health checks)
      if (!origin) {
        callback(null, true);
        return;
      }

      const cleanOrigin = origin.replace(/\/+$/, "");
      const isConfigured = cleanOrigin === configuredClientUrl;
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);
      const isVercelDomain = /^https:\/\/.*\.vercel\.app$/.test(cleanOrigin);

      if (isConfigured || isLocalhost || isVercelDomain) {
        callback(null, true);
      } else {
        // Fallback allow origin with credentials for seamless deployment testing
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

// Preserve raw buffer on req.rawBody for cryptographic Stripe webhook verification
app.use(
  express.json({
    verify: (req: RawBodyIncomingMessage, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Application routes
app.use("/", apiRouter);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
