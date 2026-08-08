import { PrismaClient, Role, CustomerType, CustomerStatus, ChallanStatus, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🤖 Starting automated transaction validation tests...');

  // 1. Setup temporary test records
  const testUser = await prisma.user.create({
    data: {
      email: 'tester@fundsroom.com',
      password: 'password123',
      name: 'System Tester',
      role: Role.ADMIN,
    },
  });

  const testCustomer = await prisma.customer.create({
    data: {
      name: 'Test Client Ltd',
      mobile: '9900990099',
      email: 'test@client.com',
      businessName: 'Integrity Tester LLC',
      customerType: CustomerType.DISTRIBUTOR,
      address: '100 Test Suite Lane',
      status: CustomerStatus.ACTIVE,
    },
  });

  const testProduct = await prisma.product.create({
    data: {
      name: 'Integrity Test Widget',
      sku: 'WIDGET-TEST-99',
      category: 'Electronics',
      unitPrice: 100.0,
      currentStock: 5, // Starts with 5 stock units
      minimumStockAlertQty: 2,
      location: 'Testing Shelf X',
    },
  });

  console.log(`✅ Provisioned test user, customer, and product (${testProduct.name}, initial stock: 5).`);

  // --- Test Case 1: Insufficient stock rejection ---
  console.log('\n--- Test Case 1: Attempt to confirm Challan exceeding stock (quantity: 6) ---');
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch current product stock
      const p = await tx.product.findUnique({ where: { id: testProduct.id } });
      if (!p) throw new Error('Product not found in Tx');

      // Verify stock
      if (p.currentStock < 6) {
        throw new Error('INSUFFICIENT_STOCK: Requested: 6, Available: ' + p.currentStock);
      }

      // Safe Decrement stock
      await tx.product.updateMany({
        where: { id: testProduct.id, currentStock: { gte: 6 } },
        data: { currentStock: { decrement: 6 } },
      });
    });
    console.error('❌ Test Case 1 Failed: Transaction allowed stock to go negative!');
  } catch (err: any) {
    if (err.message.includes('INSUFFICIENT_STOCK')) {
      console.log('✅ Test Case 1 Passed: Transaction successfully rejected and rolled back! Error message:');
      console.log('   ', err.message);
    } else {
      console.error('❌ Test Case 1 Failed with unexpected error:', err.message);
    }
  }

  // Double-check stock did not change
  const postTest1Product = await prisma.product.findUnique({ where: { id: testProduct.id } });
  console.log(`🔍 Current stock is still: ${postTest1Product?.currentStock} (Expected: 5)`);

  // --- Test Case 2: Successful Stock Allocation ---
  console.log('\n--- Test Case 2: Confirm Challan for 3 items (under stock limit) ---');
  let challanId = '';
  try {
    const newChallan = await prisma.$transaction(async (tx) => {
      const quantityRequested = 3;
      const p = await tx.product.findUnique({ where: { id: testProduct.id } });
      if (!p) throw new Error('Product not found in Tx');

      if (p.currentStock < quantityRequested) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      // Decrement stock
      const updateResult = await tx.product.updateMany({
        where: { id: testProduct.id, currentStock: { gte: quantityRequested } },
        data: { currentStock: { decrement: quantityRequested } },
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION_FAILED');
      }

      // Log movement
      await tx.stockMovementLog.create({
        data: {
          productId: testProduct.id,
          qtyChanged: quantityRequested,
          movementType: MovementType.OUT,
          reason: 'Sales Challan #CH-TEST-99 confirmation',
          createdById: testUser.id,
        },
      });

      // Save Challan
      const ch = await tx.challan.create({
        data: {
          challanNumber: 'CH-TEST-9999',
          customerId: testCustomer.id,
          status: ChallanStatus.CONFIRMED,
          totalQuantity: quantityRequested,
          totalAmount: quantityRequested * p.unitPrice,
          createdById: testUser.id,
          lineItems: {
            create: [
              {
                productId: testProduct.id,
                quantity: quantityRequested,
                priceAtSale: p.unitPrice,
                productName: p.name,
                productSku: p.sku,
              },
            ],
          },
        },
      });
      return ch;
    });

    challanId = newChallan.id;
    console.log(`✅ Test Case 2 Passed: Challan created and stock allocated! Challan No: ${newChallan.challanNumber}`);
  } catch (err: any) {
    console.error('❌ Test Case 2 Failed:', err.message);
  }

  // Double-check stock did change
  const postTest2Product = await prisma.product.findUnique({ where: { id: testProduct.id } });
  console.log(`🔍 Current stock is now: ${postTest2Product?.currentStock} (Expected: 2)`);

  // --- Test Case 3: Reversal / Restocking on Cancellation ---
  console.log('\n--- Test Case 3: Cancel confirmed Challan and check restocking logic ---');
  try {
    await prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id: challanId },
        include: { lineItems: true },
      });

      if (!challan) throw new Error('Challan not found');

      // Revert stock
      for (const line of challan.lineItems) {
        await tx.product.update({
          where: { id: line.productId },
          data: { currentStock: { increment: line.quantity } },
        });

        // Log movement IN
        await tx.stockMovementLog.create({
          data: {
            productId: line.productId,
            qtyChanged: line.quantity,
            movementType: MovementType.IN,
            reason: `Restocked from Cancelled Sales Challan #${challan.challanNumber}`,
            createdById: testUser.id,
          },
        });
      }

      // Update status
      await tx.challan.update({
        where: { id: challanId },
        data: { status: ChallanStatus.CANCELLED },
      });
    });

    console.log('✅ Test Case 3 Passed: Challan status cancelled and items restocked!');
  } catch (err: any) {
    console.error('❌ Test Case 3 Failed:', err.message);
  }

  // Double-check stock returned to 5
  const postTest3Product = await prisma.product.findUnique({ where: { id: testProduct.id } });
  console.log(`🔍 Current stock returned to: ${postTest3Product?.currentStock} (Expected: 5)`);

  // Clean up
  console.log('\n🧹 Cleaning up test logs...');
  await prisma.challanLineItem.deleteMany({ where: { challanId } });
  await prisma.challan.delete({ where: { id: challanId } });
  await prisma.stockMovementLog.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });
  await prisma.customer.delete({ where: { id: testCustomer.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  console.log('🎉 Integration transaction verification run completed.');
}

runTests()
  .catch((e) => {
    console.error('❌ Test run crashed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
