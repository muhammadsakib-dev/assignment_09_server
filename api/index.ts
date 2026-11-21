import type { Request, Response } from "express";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

export default async function handler(req: Request, res: Response) {
  try {
    await connectDB();
  } catch (err) {
    console.error("Vercel Serverless DB connection error:", err);
  }
  return app(req, res);
}
