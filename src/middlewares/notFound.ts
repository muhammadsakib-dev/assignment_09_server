import type { Request, Response } from "express";

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: `Route ${req.method} ${req.originalUrl} does not exist.`,
      },
    ],
  });
};

export default notFound;
