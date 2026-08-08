import { Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { ChallanStatus, MovementType } from '@prisma/client';

// Generate sequential challan number (e.g. CH-2026-0001)
const generateChallanNumber = async (tx: any): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const lastChallan = await tx.challan.findFirst({
    where: {
      challanNumber: {
        startsWith: `CH-${currentYear}-`,
      },
    },
    orderBy: {
      challanNumber: 'desc',
    },
  });

  let nextNum = 1;
  if (lastChallan) {
    const parts = lastChallan.challanNumber.split('-');
    const lastSeq = parseInt(parts[2]);
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1;
    }
  }

  return `CH-${currentYear}-${String(nextNum).padStart(4, '0')}`;
};

// Create a new Challan (Draft or Confirmed)
export const createChallan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authorId = req.user?.id;
  if (!authorId) {
    const error: AppError = new Error('Authentication required');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const { customerId, status = ChallanStatus.DRAFT, lineItems } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      const error: AppError = new Error('Challan must contain at least one line item');
      error.statusCode = 400;
      error.code = 'INVALID_LINE_ITEMS';
      return next(error);
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      const error: AppError = new Error('Customer not found');
      error.statusCode = 404;
      error.code = 'CUSTOMER_NOT_FOUND';
      return next(error);
    }

    // Run transaction
    const newChallan = await prisma.$transaction(async (tx) => {
      // 1. Fetch product snapshots and verify existence
      const productIds = lineItems.map((item: any) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new Error('One or more products specified in line items do not exist');
      }

      // Map product snapshot data for quick access
      const productMap = new Map(products.map((p) => [p.id, p]));

      // 2. Prepare line items snapshots and calculate totals
      let totalQuantity = 0;
      let totalAmount = 0;
      const parsedLines = lineItems.map((item: any) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error('Product not found mapping snapshots');
        }
        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity ${item.quantity} for product ${product.name}`);
        }

        totalQuantity += qty;
        totalAmount += qty * product.unitPrice;

        return {
          productId: item.productId,
          quantity: qty,
          priceAtSale: product.unitPrice,
          productName: product.name,
          productSku: product.sku,
        };
      });

      // 3. Generate sequential challan number
      const challanNumber = await generateChallanNumber(tx);

      // 4. Handle stock changes if creating as CONFIRMED
      if (status === ChallanStatus.CONFIRMED) {
        for (const line of parsedLines) {
          const product = productMap.get(line.productId)!;
          
          // Check stock
          if (product.currentStock < line.quantity) {
            const err: AppError = new Error(`Insufficient stock for product ${product.name} (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${line.quantity}`);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_STOCK';
            err.details = { sku: product.sku, name: product.name, available: product.currentStock, requested: line.quantity };
            throw err;
          }

          // Enforce stock never negative at DB level
          const updateResult = await tx.product.updateMany({
            where: {
              id: line.productId,
              currentStock: { gte: line.quantity },
            },
            data: {
              currentStock: {
                decrement: line.quantity,
              },
            },
          });

          if (updateResult.count === 0) {
            const err: AppError = new Error(`Concurrent modification check failed. Insufficient stock for product ${product.name} (SKU: ${product.sku})`);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_STOCK';
            throw err;
          }

          // Log stock movement
          await tx.stockMovementLog.create({
            data: {
              productId: line.productId,
              qtyChanged: line.quantity,
              movementType: MovementType.OUT,
              reason: `Sales Challan #${challanNumber} confirmation`,
              createdById: authorId,
            },
          });
        }
      }

      // 5. Save the Challan
      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status,
          totalQuantity,
          totalAmount,
          createdById: authorId,
          lineItems: {
            create: parsedLines,
          },
        },
        include: {
          lineItems: true,
          customer: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return challan;
    });

    res.status(201).json({ data: newChallan });
  } catch (err: any) {
    if (err.statusCode) {
      return next(err);
    }
    const standardErr: AppError = new Error(err.message || 'Error creating challan');
    standardErr.statusCode = 400;
    standardErr.code = 'BAD_REQUEST';
    next(standardErr);
  }
};

// List Challans with filtering and pagination
export const getChallans = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as ChallanStatus;
    const customerId = req.query.customerId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day to make range inclusive
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              businessName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json({
      data: challans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get single Challan details
export const getChallanById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!challan) {
      const error: AppError = new Error('Challan not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    res.json({ data: challan });
  } catch (err) {
    next(err);
  }
};

// Update Challan Status (Draft -> Confirmed, Confirmed -> Cancelled, Draft -> Cancelled)
export const updateChallanStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body; // CONFIRMED or CANCELLED
  const authorId = req.user?.id;

  if (!authorId) {
    const error: AppError = new Error('Authentication required');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const updatedChallan = await prisma.$transaction(async (tx) => {
      // 1. Fetch current Challan state with line items
      const challan = await tx.challan.findUnique({
        where: { id },
        include: { lineItems: true },
      });

      if (!challan) {
        const error: AppError = new Error('Challan not found');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      // Check transition validity
      if (challan.status === status) {
        return challan; // No change
      }

      if (challan.status === ChallanStatus.CANCELLED) {
        const error: AppError = new Error('Cannot change status of a Cancelled challan');
        error.statusCode = 400;
        error.code = 'INVALID_TRANSITION';
        throw error;
      }

      if (challan.status === ChallanStatus.CONFIRMED && status === ChallanStatus.DRAFT) {
        const error: AppError = new Error('Cannot revert a Confirmed challan back to Draft');
        error.statusCode = 400;
        error.code = 'INVALID_TRANSITION';
        throw error;
      }

      // 2. Handle Transitions
      if (status === ChallanStatus.CONFIRMED) {
        // Transition: DRAFT -> CONFIRMED
        for (const line of challan.lineItems) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          if (!product) {
            throw new Error(`Product snapshot verification failed: Product with ID ${line.productId} not found`);
          }

          if (product.currentStock < line.quantity) {
            const err: AppError = new Error(`Insufficient stock for product ${product.name} (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${line.quantity}`);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_STOCK';
            err.details = { sku: product.sku, name: product.name, available: product.currentStock, requested: line.quantity };
            throw err;
          }

          // Safe Decrement stock
          const updateResult = await tx.product.updateMany({
            where: {
              id: line.productId,
              currentStock: { gte: line.quantity },
            },
            data: {
              currentStock: {
                decrement: line.quantity,
              },
            },
          });

          if (updateResult.count === 0) {
            const err: AppError = new Error(`Concurrent modification check failed. Insufficient stock for product ${product.name}`);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_STOCK';
            throw err;
          }

          // Stock Log
          await tx.stockMovementLog.create({
            data: {
              productId: line.productId,
              qtyChanged: line.quantity,
              movementType: MovementType.OUT,
              reason: `Sales Challan #${challan.challanNumber} confirmation`,
              createdById: authorId,
            },
          });
        }
      } else if (status === ChallanStatus.CANCELLED) {
        // Transition: CONFIRMED -> CANCELLED or DRAFT -> CANCELLED
        if (challan.status === ChallanStatus.CONFIRMED) {
          // Revert stock since it was confirmed
          for (const line of challan.lineItems) {
            await tx.product.update({
              where: { id: line.productId },
              data: {
                currentStock: {
                  increment: line.quantity,
                },
              },
            });

            // Stock Log (IN)
            await tx.stockMovementLog.create({
              data: {
                productId: line.productId,
                qtyChanged: line.quantity,
                movementType: MovementType.IN,
                reason: `Restocked from Cancelled Sales Challan #${challan.challanNumber}`,
                createdById: authorId,
              },
            });
          }
        }
      }

      // 3. Update Status
      return await tx.challan.update({
        where: { id },
        data: { status },
        include: {
          customer: true,
          lineItems: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });
    });

    res.json({ data: updatedChallan });
  } catch (err: any) {
    if (err.statusCode) {
      return next(err);
    }
    const standardErr: AppError = new Error(err.message || 'Error updating status');
    standardErr.statusCode = 400;
    standardErr.code = 'BAD_REQUEST';
    next(standardErr);
  }
};
