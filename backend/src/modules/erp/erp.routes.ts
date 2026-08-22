import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { authMiddleware, roleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import {
  getLocations,
  createLocation,
  getInventory,
  createOrUpdateInventory,
  updateDamagedStock,
  getWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus,
  getTransfers,
  createTransfer,
  dispatchTransfer,
  receiveTransfer,
  getOrders,
  createCustomerOrder,
  cancelCustomerOrder,
  getUsers,
} from './erp.controller';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const locationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Location name is required'),
  }),
});

const inventorySchema = z.object({
  body: z.object({
    item: z.string().min(1, 'Item name is required'),
    category: z.string().min(1, 'Category is required'),
    locationId: z.string().uuid('Invalid Location ID format'),
    batch: z.string().min(1, 'Batch is required'),
    physicalQuantity: z.number().int('Quantity must be an integer'),
  }),
});

const damagedSchema = z.object({
  body: z.object({
    inventoryId: z.string().uuid('Invalid Inventory ID format'),
    quantityChanged: z.number().int('Quantity must be an integer'),
  }),
});

const workOrderSchema = z.object({
  body: z.object({
    workOrderId: z.string().min(1, 'Work Order ID is required'),
    locationId: z.string().uuid('Invalid Location ID format'),
    inventoryId: z.string().uuid('Invalid Inventory ID format'),
    requiredQuantity: z.number().int().positive('Required quantity must be positive'),
    assignedUserId: z.string().uuid('Invalid User ID format'),
  }),
});

const workOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']),
  }),
});

const transferSchema = z.object({
  body: z.object({
    transferId: z.string().min(1, 'Transfer ID is required'),
    sourceLocationId: z.string().uuid('Invalid Source Location ID'),
    destinationLocationId: z.string().uuid('Invalid Destination Location ID'),
    inventoryId: z.string().uuid('Invalid Inventory ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
  }),
});

const receiveTransferSchema = z.object({
  body: z.object({
    receivedQty: z.number().int().positive('Received quantity must be positive'),
  }),
});

const orderSchema = z.object({
  body: z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
    customerId: z.string().uuid('Invalid Customer ID'),
    inventoryId: z.string().uuid('Invalid Inventory ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
  }),
});

// ============================================================================
// ROUTES DEFINITION
// ============================================================================

// 1. Locations
router.get(
  '/locations',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS]),
  getLocations as any
);

router.post(
  '/locations',
  authMiddleware,
  roleMiddleware([Role.ADMIN]),
  validate(locationSchema),
  createLocation as any
);

// 2. Inventory
router.get(
  '/inventory',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS]),
  getInventory as any
);

router.post(
  '/inventory',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  validate(inventorySchema),
  createOrUpdateInventory as any
);

router.post(
  '/inventory/damaged',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  validate(damagedSchema),
  updateDamagedStock as any
);

// 3. Work Orders
router.get(
  '/work-orders',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS]),
  getWorkOrders as any
);

router.post(
  '/work-orders',
  authMiddleware,
  roleMiddleware([Role.ADMIN]),
  validate(workOrderSchema),
  createWorkOrder as any
);

router.patch(
  '/work-orders/:id/status',
  authMiddleware,
  roleMiddleware([Role.ADMIN]),
  validate(workOrderStatusSchema),
  updateWorkOrderStatus as any
);

// 4. Internal Stock Transfers
router.get(
  '/transfers',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS]),
  getTransfers as any
);

router.post(
  '/transfers',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  validate(transferSchema),
  createTransfer as any
);

router.post(
  '/transfers/:id/dispatch',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  dispatchTransfer as any
);

router.post(
  '/transfers/:id/receive',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE]),
  validate(receiveTransferSchema),
  receiveTransfer as any
);

// 5. Customer Orders
router.get(
  '/orders',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS]),
  getOrders as any
);

router.post(
  '/orders',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES]),
  validate(orderSchema),
  createCustomerOrder as any
);

router.post(
  '/orders/:id/cancel',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.SALES]),
  cancelCustomerOrder as any
);

router.get(
  '/users',
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS]),
  getUsers as any
);

export default router;
