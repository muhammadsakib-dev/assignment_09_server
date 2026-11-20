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

// Normalize client origin (strip trailing slash for strict CORS matching)
const normalizedOrigin = config.clientUrl.replace(/\/+$/, "");

// Middlewares
app.use(
  cors({
    origin: normalizedOrigin,
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
