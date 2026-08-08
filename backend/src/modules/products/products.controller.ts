import { Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { MovementType } from '@prisma/client';

// List products with pagination, search and filters
export const getProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const lowStock = (req.query.lowStock as string) === 'true';
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (lowStock) {
      // currentStock <= minimumStockAlertQty
      where.AND = [
        ...(where.AND || []),
        {
          currentStock: {
            lte: prisma.product.fields.minimumStockAlertQty,
          },
        },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
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

// Get single product with its stock movement log
export const getProductById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
};

// Create product and log initial stock in a transaction
export const createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authorId = req.user?.id;
  if (!authorId) {
    const error: AppError = new Error('Authentication required');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const {
      name,
      sku,
      category,
      unitPrice,
      currentStock,
      minimumStockAlertQty,
      location,
    } = req.body;

    // Check if SKU is unique
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      const error: AppError = new Error('Product with this SKU already exists');
      error.statusCode = 400;
      error.code = 'SKU_ALREADY_EXISTS';
      return next(error);
    }

    // Run in a single transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          sku,
          category,
          unitPrice,
          currentStock,
          minimumStockAlertQty,
          location,
        },
      });

      if (currentStock > 0) {
        await tx.stockMovementLog.create({
          data: {
            productId: product.id,
            qtyChanged: currentStock,
            movementType: MovementType.IN,
            reason: 'Initial Stock setup',
            createdById: authorId,
          },
        });
      }

      return product;
    });

    res.status(201).json({ data: newProduct });
  } catch (err) {
    next(err);
  }
};

// Edit product and log manual stock adjustment in a transaction
export const updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const authorId = req.user?.id;

  if (!authorId) {
    const error: AppError = new Error('Authentication required');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const {
      name,
      sku,
      category,
      unitPrice,
      currentStock,
      minimumStockAlertQty,
      location,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    // Check SKU conflict if modified
    if (sku !== existingProduct.sku) {
      const conflictSku = await prisma.product.findUnique({ where: { sku } });
      if (conflictSku) {
        const error: AppError = new Error('Product with this SKU already exists');
        error.statusCode = 400;
        error.code = 'SKU_CONFLICT';
        return next(error);
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const stockDiff = currentStock - existingProduct.currentStock;

      const product = await tx.product.update({
        where: { id },
        data: {
          name,
          sku,
          category,
          unitPrice,
          currentStock,
          minimumStockAlertQty,
          location,
        },
      });

      if (stockDiff !== 0) {
        await tx.stockMovementLog.create({
          data: {
            productId: product.id,
            qtyChanged: Math.abs(stockDiff),
            movementType: stockDiff > 0 ? MovementType.IN : MovementType.OUT,
            reason: `Manual stock adjustment (from ${existingProduct.currentStock} to ${currentStock})`,
            createdById: authorId,
          },
        });
      }

      return product;
    });

    res.json({ data: updatedProduct });
  } catch (err) {
    next(err);
  }
};
