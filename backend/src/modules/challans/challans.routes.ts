import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { authMiddleware, roleMiddleware } from '../../middleware/auth';
import { Role, ChallanStatus } from '@prisma/client';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallanStatus,
} from './challans.controller';

const router = Router();

const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid Customer ID format'),
    status: z.nativeEnum(ChallanStatus, {
      errorMap: () => ({ message: 'Status must be DRAFT or CONFIRMED' }),
    }).optional(),
    lineItems: z.array(
      z.object({
        productId: z.string().uuid('Invalid Product ID format'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
      })
    ).min(1, 'At least one line item is required'),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([ChallanStatus.CONFIRMED, ChallanStatus.CANCELLED], {
      errorMap: () => ({ message: 'Status must be CONFIRMED or CANCELLED' }),
    }),
  }),
});

// All roles can search/view list or get single challan
router.get(
  '/',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]),
  getChallans as any
);

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]),
  getChallanById as any
);

// Only Admin and Sales can create challans
router.post(
  '/',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES]),
  validate(createChallanSchema),
  createChallan as any
);

// Admin, Sales, and Accounts can update status (Confirm or Cancel)
router.put(
  '/:id/status',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.ACCOUNTS]),
  validate(updateStatusSchema),
  updateChallanStatus as any
);

export default router;
