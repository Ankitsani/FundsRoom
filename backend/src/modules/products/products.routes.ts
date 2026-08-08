import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { authMiddleware, roleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from './products.controller';

const router = Router();

const productSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().min(1, 'SKU is required'),
    category: z.string().min(1, 'Category is required'),
    unitPrice: z.number().positive('Unit price must be greater than zero'),
    currentStock: z.number().int().nonnegative('Current stock must be zero or more'),
    minimumStockAlertQty: z.number().int().nonnegative('Minimum stock alert quantity must be zero or more'),
    location: z.string().min(1, 'Location/Warehouse is required'),
  }),
});

// All roles (Admin, Sales, Warehouse, Accounts) can read products/stock
router.get(
  '/',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]),
  getProducts as any
);

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS]),
  getProductById as any
);

// Admin and Warehouse roles can create or modify product details/stock
router.post(
  '/',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  validate(productSchema),
  createProduct as any
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  validate(productSchema),
  updateProduct as any
);

export default router;
