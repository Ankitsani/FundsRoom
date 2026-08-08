import { Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

// List customers with pagination and search
export const getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
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

// Get single customer details with follow-up notes
export const getCustomerById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUpNotes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      const error: AppError = new Error('Customer not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
};

// Create new customer
export const createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      address,
      status,
      followUpDate,
      notes,
    } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
      },
    });

    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
};

// Edit customer
export const updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      address,
      status,
      followUpDate,
      notes,
    } = req.body;

    const customerExists = await prisma.customer.findUnique({ where: { id } });
    if (!customerExists) {
      const error: AppError = new Error('Customer not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
      },
    });

    res.json({ data: updatedCustomer });
  } catch (err) {
    next(err);
  }
};

// Add follow-up note
export const addFollowUpNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id: customerId } = req.params;
  const { noteText } = req.body;
  const authorId = req.user?.id;

  if (!authorId) {
    const error: AppError = new Error('Authentication required to add follow-up note');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const customerExists = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customerExists) {
      const error: AppError = new Error('Customer not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    const note = await prisma.customerFollowUpNote.create({
      data: {
        customerId,
        authorId,
        noteText,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({ data: note });
  } catch (err) {
    next(err);
  }
};
