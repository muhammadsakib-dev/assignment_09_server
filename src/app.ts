// Importing required modules
import express, { type Application } from "express";
import cors from "cors";
import config from "./config/index.js";
import apiRouter from "./routes/index.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

// Create an Express application
const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
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
