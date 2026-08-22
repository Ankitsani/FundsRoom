import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { authMiddleware, roleMiddleware } from '../../middleware/auth';
import { Role, CustomerType, CustomerStatus } from '@prisma/client';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
} from './customers.controller';

const router = Router();

const mobileRegex = /^\+?[0-9\s\-()]{10,20}$/;
const gstRegex = /^([0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[0-9a-zA-Z]{1}[Zz][0-9a-zA-Z]{1}|[0-9a-zA-Z]{3,15})$/;

const customerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    mobile: z.string().regex(mobileRegex, 'Invalid mobile number format. Must be 10-14 digits.'),
    email: z.string().email('Invalid email address'),
    businessName: z.string().min(1, 'Business name is required'),
    gstNumber: z.string()
      .regex(gstRegex, 'Invalid Indian GSTIN format')
      .optional()
      .nullable()
      .or(z.literal(''))
      .or(z.literal(null)),
    customerType: z.nativeEnum(CustomerType, {
      errorMap: () => ({ message: 'Customer type must be Retail, Wholesale, or Distributor' }),
    }),
    address: z.string().min(1, 'Address is required'),
    status: z.nativeEnum(CustomerStatus, {
      errorMap: () => ({ message: 'Status must be Lead, Active, or Inactive' }),
    }),
    followUpDate: z.string()
      .datetime({ precision: 3, offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)) // Allow plain YYYY-MM-DD
      .or(z.string().regex(/^\d{2}-\d{2}-\d{4}$/)) // Allow plain DD-MM-YYYY
      .or(z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/)) // Allow plain DD/MM/YYYY
      .optional()
      .nullable()
      .or(z.literal(''))
      .or(z.literal(null)),
    notes: z.string().optional().nullable().or(z.literal('')),
  }),
});

const noteSchema = z.object({
  body: z.object({
    noteText: z.string().min(1, 'Note text is required'),
  }),
});

// Roles check: Admin, Sales, Accounts can access CRM. Warehouse role is restricted or read-only (so we block them from creating/editing).
// Let's allow ADMIN, SALES, ACCOUNTS to create/edit.
// Let's allow ADMIN, SALES, ACCOUNTS, WAREHOUSE to view customers (read-only for Warehouse).
router.get(
  '/',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.ACCOUNTS, Role.WAREHOUSE]),
  getCustomers as any
);

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.ACCOUNTS, Role.WAREHOUSE]),
  getCustomerById as any
);

router.post(
  '/',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.ACCOUNTS]),
  validate(customerSchema),
  createCustomer as any
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.ACCOUNTS]),
  validate(customerSchema),
  updateCustomer as any
);

router.post(
  '/:id/notes',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.ACCOUNTS]),
  validate(noteSchema),
  addFollowUpNote as any
);

export default router;
