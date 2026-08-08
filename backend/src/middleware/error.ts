import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';
  const details = err.details || null;

  if (statusCode === 500) {
    console.error('[Error Details]:', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      code,
      details,
    },
  });
};
