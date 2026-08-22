import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import prisma from '../../config/db';
import jwt from 'jsonwebtoken';
import { Role, WorkOrderStatus, TransferStatus, CustomerOrderStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-replace-in-production';

const generateToken = (role: Role, email = 'test@fundsroom.com', name = 'Test User') => {
  return jwt.sign({ id: '00000000-0000-0000-0000-000000000000', email, role, name }, JWT_SECRET);
};

describe('Mini Operations ERP Integration Tests', () => {
  let locationAId = '';
  let locationBId = '';
  let inventoryAId = '';
  let customerId = '';

  const adminToken = generateToken(Role.ADMIN);
  const salesToken = generateToken(Role.SALES);
  const warehouseToken = generateToken(Role.WAREHOUSE);
  const accountsToken = generateToken(Role.ACCOUNTS);

  beforeAll(async () => {
    // Setup test customer
    const cust = await prisma.customer.create({
      data: {
        name: 'ERP Test Client',
        mobile: '1234567890',
        email: 'erp_test@client.com',
        businessName: 'ERP Test Biz',
        customerType: 'RETAIL',
        address: '123 Test St',
        status: 'ACTIVE',
      },
    });
    customerId = cust.id;

    // Create locations
    const locA = await prisma.location.create({ data: { name: 'Test Location A' } });
    locationAId = locA.id;

    const locB = await prisma.location.create({ data: { name: 'Test Location B' } });
    locationBId = locB.id;

    // Create initial inventories
    const invA = await prisma.inventory.create({
      data: {
        item: 'Test Widget',
        category: 'Hardware',
        locationId: locationAId,
        batch: 'BATCH-A',
        physicalQuantity: 10,
        reservedQuantity: 0,
        damagedQuantity: 0,
      },
    });
    inventoryAId = invA.id;
  });

  afterAll(async () => {
    // Clean up all testing records
    await prisma.customerOrder.deleteMany({ where: { inventoryId: inventoryAId } });
    await prisma.internalTransfer.deleteMany({
      where: {
        OR: [
          { sourceLocationId: locationAId },
          { destinationLocationId: locationAId }
        ]
      }
    });
    await prisma.workOrder.deleteMany({ where: { locationId: locationAId } });
    await prisma.inventoryTransaction.deleteMany({
      where: {
        inventory: {
          locationId: { in: [locationAId, locationBId] }
        }
      }
    });
    await prisma.inventory.deleteMany({
      where: {
        OR: [
          { id: inventoryAId },
          { locationId: locationBId }
        ]
      }
    });
    await prisma.location.deleteMany({
      where: {
        id: { in: [locationAId, locationBId] }
      }
    });
    await prisma.customer.deleteMany({ where: { id: customerId } });
  });

  // --- Mandatory Test 5: Unauthorized role cannot perform restricted operation ---
  it('should block unauthorized roles from creating Work Orders (Admin only)', async () => {
    const res = await request(app)
      .post('/api/erp/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        workOrderId: 'WO-ERR-01',
        locationId: locationAId,
        inventoryId: inventoryAId,
        requiredQuantity: 5,
        assignedUserId: '00000000-0000-0000-0000-000000000000',
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // --- Mandatory Test 1: Cannot reserve more than available inventory ---
  it('should reject customer reservation if quantity exceeds available inventory', async () => {
    const res = await request(app)
      .post('/api/erp/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        orderNumber: 'ORD-ERR-01',
        customerId,
        inventoryId: inventoryAId,
        quantity: 15, // available is 10
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // --- Concurrency Test: Concurrent Stock Reservation ---
  it('should handle concurrent reservation requests correctly and block double reservation', async () => {
    // Current stock is 10. Let's fire two concurrent requests for 6 items.
    // Only one should succeed, other must fail.
    const resPromises = [
      request(app)
        .post('/api/erp/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          orderNumber: 'ORD-CONC-01',
          customerId,
          inventoryId: inventoryAId,
          quantity: 6,
        }),
      request(app)
        .post('/api/erp/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          orderNumber: 'ORD-CONC-02',
          customerId,
          inventoryId: inventoryAId,
          quantity: 6,
        })
    ];

    const results = await Promise.all(resPromises);
    const statuses = results.map(r => r.status);
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    // Verify stock is updated correctly (reserved should be 6, physical is 10)
    const updatedInv = await prisma.inventory.findUnique({ where: { id: inventoryAId } });
    expect(updatedInv?.reservedQuantity).toBe(6);
  });

  // --- Order Cancellation Revaluation Test (Scenario 3) ---
  it('should cancel order and release reserved stock back to available pool', async () => {
    // Find the successful order from the previous concurrent test
    const order = await prisma.customerOrder.findFirst({
      where: { orderNumber: { in: ['ORD-CONC-01', 'ORD-CONC-02'] }, status: CustomerOrderStatus.RESERVED }
    });
    expect(order).toBeDefined();

    const res = await request(app)
      .post(`/api/erp/orders/${order!.id}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);

    const updatedInv = await prisma.inventory.findUnique({ where: { id: inventoryAId } });
    expect(updatedInv?.reservedQuantity).toBe(0);
  });

  // --- Mandatory Test 2: Cannot transfer more than available inventory ---
  it('should reject stock transfer dispatch if source physical quantity is insufficient', async () => {
    // Create transfer for 20 units (current physical is 10)
    const createRes = await request(app)
      .post('/api/erp/transfers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        transferId: 'TR-ERR-01',
        sourceLocationId: locationAId,
        destinationLocationId: locationBId,
        inventoryId: inventoryAId,
        quantity: 20,
      });
    expect(createRes.status).toBe(201);
    const transferId = createRes.body.data.id;

    // Dispatching should fail because source physical stock is 10 but transfer wants 20
    const dispRes = await request(app)
      .post(`/api/erp/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(dispRes.status).toBe(400);
    expect(dispRes.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // --- Mandatory Test 3: Destination stock increases only after receipt, never on dispatch ---
  it('should not increase destination inventory on dispatch, but should on receipt', async () => {
    // Create a valid transfer for 4 units (current physical is 10)
    const createRes = await request(app)
      .post('/api/erp/transfers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        transferId: 'TR-OK-01',
        sourceLocationId: locationAId,
        destinationLocationId: locationBId,
        inventoryId: inventoryAId,
        quantity: 4,
      });
    expect(createRes.status).toBe(201);
    const transferId = createRes.body.data.id;

    // Verify destination stock does not exist yet
    let destInv = await prisma.inventory.findUnique({
      where: {
        item_locationId_batch: {
          item: 'Test Widget',
          locationId: locationBId,
          batch: 'BATCH-A'
        }
      }
    });
    expect(destInv).toBeNull();

    // Dispatch transfer
    const dispRes = await request(app)
      .post(`/api/erp/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(dispRes.status).toBe(200);

    // Verify source physical stock decreased (10 - 4 = 6)
    const sourceInv = await prisma.inventory.findUnique({ where: { id: inventoryAId } });
    expect(sourceInv?.physicalQuantity).toBe(6);

    // Verify destination stock is STILL not increased/created
    destInv = await prisma.inventory.findUnique({
      where: {
        item_locationId_batch: {
          item: 'Test Widget',
          locationId: locationBId,
          batch: 'BATCH-A'
        }
      }
    });
    expect(destInv).toBeNull();

    // Receive transfer (Test partial receipt - receive 3 of 4)
    const recvRes = await request(app)
      .post(`/api/erp/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ receivedQty: 3 });
    expect(recvRes.status).toBe(200);
    expect(recvRes.body.data.status).toBe(TransferStatus.PARTIALLY_RECEIVED);

    // Destination stock should now exist and be exactly 3
    destInv = await prisma.inventory.findUnique({
      where: {
        item_locationId_batch: {
          item: 'Test Widget',
          locationId: locationBId,
          batch: 'BATCH-A'
        }
      }
    });
    expect(destInv).toBeDefined();
    expect(destInv?.physicalQuantity).toBe(3);

    // Receive remainder (receive final 1 of 4)
    const recvResFinal = await request(app)
      .post(`/api/erp/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ receivedQty: 1 });
    expect(recvResFinal.status).toBe(200);
    expect(recvResFinal.body.data.status).toBe(TransferStatus.RECEIVED);

    // Destination stock should now be 4
    destInv = await prisma.inventory.findUnique({
      where: {
        item_locationId_batch: {
          item: 'Test Widget',
          locationId: locationBId,
          batch: 'BATCH-A'
        }
      }
    });
    expect(destInv?.physicalQuantity).toBe(4);

    // --- Mandatory Test 4: Same transfer cannot be received twice ---
    const recvResDouble = await request(app)
      .post(`/api/erp/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ receivedQty: 1 });
    expect(recvResDouble.status).toBe(409);
    expect(recvResDouble.body.error.code).toBe('ALREADY_RECEIVED');
  });
});
