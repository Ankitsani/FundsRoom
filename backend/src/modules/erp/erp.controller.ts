import { Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { WorkOrderStatus, TransferStatus, CustomerOrderStatus } from '@prisma/client';

// ============================================================================
// 1. LOCATIONS
// ============================================================================

export const getLocations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ data: locations });
  } catch (err) {
    next(err);
  }
};

export const createLocation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const existing = await prisma.location.findUnique({ where: { name } });
    if (existing) {
      const error: AppError = new Error('Location with this name already exists');
      error.statusCode = 409;
      error.code = 'DUPLICATE_LOCATION';
      return next(error);
    }
    const location = await prisma.location.create({ data: { name } });
    res.status(201).json({ data: location });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// 2. INVENTORY
// ============================================================================

export const getInventory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { locationId, search } = req.query;

    const where: any = {};
    if (locationId) {
      where.locationId = locationId as string;
    }
    if (search) {
      where.OR = [
        { item: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
        { batch: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const inventoryItems = await prisma.inventory.findMany({
      where,
      include: { location: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Dynamically derive availableQuantity
    const data = inventoryItems.map((inv) => ({
      ...inv,
      availableQuantity: Math.max(0, inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateInventory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { item, category, locationId, batch, physicalQuantity } = req.body;

    const qty = parseInt(physicalQuantity);

    // Run in a transaction to prevent race conditions on create or update
    const result = await prisma.$transaction(async (tx) => {
      let inv = await tx.inventory.findUnique({
        where: {
          item_locationId_batch: { item, locationId, batch },
        },
      });

      const reference = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (inv) {
        // Update physical stock
        inv = await tx.inventory.update({
          where: { id: inv.id },
          data: {
            physicalQuantity: {
              increment: qty,
            },
          },
        });

        // Write transaction log
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            quantityChanged: qty,
            type: qty >= 0 ? 'ADD' : 'SUBTRACT',
            reference,
          },
        });
      } else {
        if (qty < 0) {
          throw new Error('Initial physical quantity cannot be negative');
        }

        // Create new record
        inv = await tx.inventory.create({
          data: {
            item,
            category,
            locationId,
            batch,
            physicalQuantity: qty,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        });

        // Write transaction log
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            quantityChanged: qty,
            type: 'ADD',
            reference,
          },
        });
      }

      return inv;
    });

    res.status(201).json({
      data: {
        ...result,
        availableQuantity: Math.max(0, result.physicalQuantity - result.reservedQuantity - result.damagedQuantity),
      },
    });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Inventory adjustment failed');
    error.statusCode = err.message.includes('negative') ? 400 : 500;
    error.code = 'INVENTORY_ERROR';
    next(error);
  }
};

// Log or update damaged stock (Scenario 1)
export const updateDamagedStock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { inventoryId, quantityChanged } = req.body;
    const qty = parseInt(quantityChanged); // can be positive (more damaged) or negative (repaired/undamaged)

    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!inv) {
        const err: AppError = new Error('Inventory item not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      const newDamaged = inv.damagedQuantity + qty;
      if (newDamaged < 0) {
        throw new Error('Damaged quantity cannot be less than zero');
      }

      // Check available stock
      const available = inv.physicalQuantity - inv.reservedQuantity - newDamaged;
      if (available < 0) {
        throw new Error('Insufficient available stock. Damaged quantity would exceed physical stock limits.');
      }

      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: { damagedQuantity: newDamaged },
      });

      const reference = `DMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          quantityChanged: qty,
          type: qty >= 0 ? 'DAMAGE' : 'UNDAMAGE',
          reference,
        },
      });

      return updated;
    });

    res.json({
      data: {
        ...result,
        availableQuantity: Math.max(0, result.physicalQuantity - result.reservedQuantity - result.damagedQuantity),
      },
    });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Damaged stock adjustment failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'DAMAGED_STOCK_ERROR';
    next(error);
  }
};

// ============================================================================
// 3. WORK ORDERS
// ============================================================================

export const getWorkOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        location: true,
        inventory: true,
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: workOrders });
  } catch (err) {
    next(err);
  }
};

export const createWorkOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { workOrderId, locationId, inventoryId, requiredQuantity, assignedUserId } = req.body;
    const reqQty = parseInt(requiredQuantity);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.workOrder.findUnique({ where: { workOrderId } });
      if (existing) {
        const err: AppError = new Error('Work Order ID already exists');
        err.statusCode = 409;
        err.code = 'DUPLICATE_WORK_ORDER';
        throw err;
      }

      const inv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!inv) {
        const err: AppError = new Error('Inventory not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (inv.locationId !== locationId) {
        throw new Error('Inventory does not belong to specified location');
      }

      // Compute shortage
      const available = Math.max(0, inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity);
      const shortageQuantity = Math.max(0, reqQty - available);

      const wo = await tx.workOrder.create({
        data: {
          workOrderId,
          locationId,
          inventoryId,
          requiredQuantity: reqQty,
          shortageQuantity,
          assignedUserId,
          status: WorkOrderStatus.ASSIGNED,
        },
      });

      return wo;
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Work Order creation failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'WORK_ORDER_ERROR';
    next(error);
  }
};

export const updateWorkOrderStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ASSIGNED, IN_PROGRESS, COMPLETED

    const result = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({ where: { id } });
      if (!wo) {
        const err: AppError = new Error('Work Order not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      // Validate transitions
      // ASSIGNED -> IN_PROGRESS
      // IN_PROGRESS -> COMPLETED
      const current = wo.status;
      let valid = false;
      if (current === WorkOrderStatus.ASSIGNED && status === WorkOrderStatus.IN_PROGRESS) {
        valid = true;
      } else if (current === WorkOrderStatus.IN_PROGRESS && status === WorkOrderStatus.COMPLETED) {
        valid = true;
      }

      if (!valid) {
        const err: AppError = new Error(
          `Invalid state transition from ${current} to ${status}. Work orders must transition Assigned -> In Progress -> Completed.`
        );
        err.statusCode = 400;
        err.code = 'INVALID_TRANSITION';
        throw err;
      }

      const updated = await tx.workOrder.update({
        where: { id },
        data: { status },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (err: any) {
    next(err);
  }
};

// ============================================================================
// 4. INTERNAL STOCK TRANSFERS
// ============================================================================

export const getTransfers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const transfers = await prisma.internalTransfer.findMany({
      include: {
        sourceLocation: true,
        destinationLocation: true,
        inventory: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: transfers });
  } catch (err) {
    next(err);
  }
};

export const createTransfer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { transferId, sourceLocationId, destinationLocationId, inventoryId, quantity } = req.body;
    const qty = parseInt(quantity);

    if (sourceLocationId === destinationLocationId) {
      const err: AppError = new Error('Source and destination locations cannot be the same');
      err.statusCode = 400;
      err.code = 'INVALID_LOCATIONS';
      return next(err);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.internalTransfer.findUnique({ where: { transferId } });
      if (existing) {
        const err: AppError = new Error('Transfer ID already exists');
        err.statusCode = 409;
        err.code = 'DUPLICATE_TRANSFER';
        throw err;
      }

      const sourceInv = await tx.inventory.findUnique({ where: { id: inventoryId } });
      if (!sourceInv) {
        const err: AppError = new Error('Source inventory not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (sourceInv.locationId !== sourceLocationId) {
        throw new Error('Inventory does not belong to source location');
      }

      const transfer = await tx.internalTransfer.create({
        data: {
          transferId,
          sourceLocationId,
          destinationLocationId,
          inventoryId,
          quantity: qty,
          status: TransferStatus.REQUESTED,
        },
      });

      return transfer;
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Transfer creation failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'TRANSFER_ERROR';
    next(error);
  }
};

// Dispatch Stock: reduces source stock inside a transaction
export const dispatchTransfer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.internalTransfer.findUnique({
        where: { id },
        include: { inventory: true },
      });

      if (!transfer) {
        const err: AppError = new Error('Transfer not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (transfer.status !== TransferStatus.REQUESTED) {
        throw new Error(`Cannot dispatch transfer with status: ${transfer.status}`);
      }

      // Atomic conditional update to reduce physicalQuantity at source inventory
      // Only succeed if source physicalQuantity >= transfer.quantity
      const affectedRows = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "physicalQuantity" = "physicalQuantity" - ${transfer.quantity}
        WHERE id = ${transfer.inventoryId} AND "physicalQuantity" >= ${transfer.quantity}
      `;

      if (affectedRows === 0) {
        const err: AppError = new Error('INSUFFICIENT_SOURCE_STOCK: Not enough physical stock at source location to dispatch.');
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }

      const reference = `DISP-${transfer.transferId}`;
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: transfer.inventoryId,
          quantityChanged: -transfer.quantity,
          type: 'SUBTRACT',
          reference,
        },
      });

      const updated = await tx.internalTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.DISPATCHED,
          dispatchedQuantity: transfer.quantity,
        },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Transfer dispatch failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'DISPATCH_ERROR';
    next(error);
  }
};

// Receive Stock: increments destination stock inside a transaction (supports partial receipt - Scenario 2)
export const receiveTransfer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { receivedQty } = req.body;
    const currentReceived = parseInt(receivedQty);

    if (currentReceived <= 0) {
      const err: AppError = new Error('Received quantity must be greater than zero');
      err.statusCode = 400;
      err.code = 'INVALID_QTY';
      return next(err);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Re-read status inside same atomic transaction to prevent double receipt race conditions
      const transfer = await tx.internalTransfer.findUnique({
        where: { id },
        include: { inventory: true },
      });

      if (!transfer) {
        const err: AppError = new Error('Transfer not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (transfer.status === TransferStatus.RECEIVED) {
        const err: AppError = new Error('CONFLICT: Transfer has already been fully received.');
        err.statusCode = 409;
        err.code = 'ALREADY_RECEIVED';
        throw err;
      }

      if (transfer.status !== TransferStatus.DISPATCHED && transfer.status !== TransferStatus.PARTIALLY_RECEIVED) {
        throw new Error(`Cannot receive transfer with status: ${transfer.status}`);
      }

      const totalDispatched = transfer.dispatchedQuantity || transfer.quantity;
      const remainingToReceive = totalDispatched - transfer.receivedQuantity;

      if (currentReceived > remainingToReceive) {
        throw new Error(`Received quantity (${currentReceived}) exceeds remaining quantity to receive (${remainingToReceive}).`);
      }

      // Find or create destination inventory record
      let destInv = await tx.inventory.findUnique({
        where: {
          item_locationId_batch: {
            item: transfer.inventory.item,
            locationId: transfer.destinationLocationId,
            batch: transfer.inventory.batch,
          },
        },
      });

      if (!destInv) {
        destInv = await tx.inventory.create({
          data: {
            item: transfer.inventory.item,
            category: transfer.inventory.category,
            locationId: transfer.destinationLocationId,
            batch: transfer.inventory.batch,
            physicalQuantity: 0,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        });
      }

      // Increment destination physicalQuantity
      await tx.inventory.update({
        where: { id: destInv.id },
        data: {
          physicalQuantity: {
            increment: currentReceived,
          },
        },
      });

      const reference = `RECV-${transfer.transferId}-${transfer.receivedQuantity}`;
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: destInv.id,
          quantityChanged: currentReceived,
          type: 'ADD',
          reference,
        },
      });

      const newReceivedQuantity = transfer.receivedQuantity + currentReceived;
      const finalStatus = newReceivedQuantity === totalDispatched ? TransferStatus.RECEIVED : TransferStatus.PARTIALLY_RECEIVED;

      const updated = await tx.internalTransfer.update({
        where: { id },
        data: {
          receivedQuantity: newReceivedQuantity,
          status: finalStatus,
        },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Transfer receipt failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'RECEIVE_ERROR';
    next(error);
  }
};

// ============================================================================
// 5. CUSTOMER ORDERS & RESERVATIONS
// ============================================================================

export const getOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.customerOrder.findMany({
      include: {
        customer: true,
        inventory: {
          include: { location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
};

// Create customer reservation using atomic update (Section 7)
export const createCustomerOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { orderNumber, customerId, inventoryId, quantity } = req.body;
    const qty = parseInt(quantity);

    if (qty <= 0) {
      const err: AppError = new Error('Quantity must be greater than zero');
      err.statusCode = 400;
      err.code = 'INVALID_QTY';
      return next(err);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.customerOrder.findUnique({ where: { orderNumber } });
      if (existing) {
        const err: AppError = new Error('Order number already exists');
        err.statusCode = 409;
        err.code = 'DUPLICATE_ORDER';
        throw err;
      }

      // ATOMIC CONDITIONAL UPDATE - Check available stock at write time!
      // Available = physical - reserved - damaged
      const affectedRows = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reservedQuantity" = "reservedQuantity" + ${qty}
        WHERE id = ${inventoryId}
          AND ("physicalQuantity" - "reservedQuantity" - "damagedQuantity") >= ${qty}
      `;

      if (affectedRows === 0) {
        const err: AppError = new Error(
          'INSUFFICIENT_STOCK: The requested quantity exceeds available stock (Physical - Reserved - Damaged).'
        );
        err.statusCode = 409;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }

      // Save order
      const order = await tx.customerOrder.create({
        data: {
          orderNumber,
          customerId,
          inventoryId,
          quantity: qty,
          status: CustomerOrderStatus.RESERVED,
        },
      });

      // Log transaction
      const reference = `RES-${order.orderNumber}`;
      await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          quantityChanged: qty,
          type: 'RESERVE',
          reference,
        },
      });

      return order;
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Order reservation failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'RESERVATION_ERROR';
    next(error);
  }
};

// Cancel customer order & release reservation (Scenario 3)
export const cancelCustomerOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({ where: { id } });
      if (!order) {
        const err: AppError = new Error('Order not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (order.status !== CustomerOrderStatus.RESERVED) {
        throw new Error(`Cannot cancel order in status: ${order.status}`);
      }

      // Revert stock reservation
      await tx.inventory.update({
        where: { id: order.inventoryId },
        data: {
          reservedQuantity: {
            decrement: order.quantity,
          },
        },
      });

      const reference = `REL-${order.orderNumber}`;
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: order.inventoryId,
          quantityChanged: -order.quantity,
          type: 'RELEASE',
          reference,
        },
      });

      const updated = await tx.customerOrder.update({
        where: { id },
        data: {
          status: CustomerOrderStatus.CANCELLED,
        },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (err: any) {
    const error: AppError = new Error(err.message || 'Order cancellation failed');
    error.statusCode = err.statusCode || 400;
    error.code = err.code || 'CANCELLATION_ERROR';
    next(error);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
};
