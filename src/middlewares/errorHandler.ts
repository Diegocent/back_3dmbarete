/**
 * Clase de error con status HTTP y middleware que devuelve JSON.
 * Cualquier error no capturado llega aquí y se responde con status y message.
 */
import { Request, Response, NextFunction } from "express";
import multer from "multer";
import logger from "../config/logger";

export class AppError extends Error {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode: number = typeof err.statusCode === "number" ? err.statusCode : 500;
  let message: string = err.message ?? "Error interno";

  if (err instanceof multer.MulterError) {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "Archivo demasiado grande" : err.message || "Error al subir archivo";
  } else {
    statusCode = statusCode || 500;
  }

  const status = err.status || "error";

  logger.error(message, { stack: err.stack });

  res.status(statusCode).json({
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
