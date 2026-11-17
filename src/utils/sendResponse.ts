import type { Response } from "express";

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export function sendResponse<T>(res: Response, responseData: ApiResponse<T>): void {
  const { statusCode, success, message, data, meta } = responseData;
  res.status(statusCode).json({
    success,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });
}

export default sendResponse;
