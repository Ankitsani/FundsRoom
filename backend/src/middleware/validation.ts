import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './error';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.slice(1).join('.'),
          message: e.message,
        }));
        
        const validationError: AppError = new Error('Validation failed');
        validationError.statusCode = 400;
        validationError.code = 'VALIDATION_ERROR';
        validationError.details = details;
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};
