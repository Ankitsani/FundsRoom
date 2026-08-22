import { PrismaClient, Role, CustomerType, CustomerStatus, ChallanStatus, MovementType, WorkOrderStatus, TransferStatus, CustomerOrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clear database tables in correct order
  await prisma.customerOrder.deleteMany();
  await prisma.internalTransfer.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.location.deleteMany();
  await prisma.challanLineItem.deleteMany();
  await prisma.stockMovementLog.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.customerFollowUpNote.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database entries including ERP tables.');

  // 2. Hash default passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const salesPassword = await bcrypt.hash('sales123', 10);
  const warehousePassword = await bcrypt.hash('warehouse123', 10);
  const accountsPassword = await bcrypt.hash('accounts123', 10);

  // 2b. Create Locations
  const mainWarehouse = await prisma.location.create({
    data: { name: 'Main Warehouse' },
  });

  const northDepot = await prisma.location.create({
    data: { name: 'North Depot' },
  });

  const onlineHub = await prisma.location.create({
    data: { name: 'Online Hub' },
  });

  console.log('📍 Created Locations: Main Warehouse, North Depot, Online Hub.');

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@fundsroom.com',
      password: adminPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: 'sales@fundsroom.com',
      password: salesPassword,
      name: 'Sales Officer',
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      email: 'warehouse@fundsroom.com',
      password: warehousePassword,
      name: 'Warehouse Manager',
      role: Role.WAREHOUSE,
      locationId: mainWarehouse.id,
    },
  });

  const accounts = await prisma.user.create({
    data: {
      email: 'accounts@fundsroom.com',
      password: accountsPassword,
      name: 'Accounts Lead',
      role: Role.ACCOUNTS,
    },
  });

  console.log('👤 Created users with roles: ADMIN, SALES, WAREHOUSE, ACCOUNTS.');

  // 4. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Aman Gupta',
      mobile: '9876543210',
      email: 'aman@guptaretail.com',
      businessName: 'Aman Retailers',
      gstNumber: '07AAAAA1111A1Z1',
      customerType: CustomerType.RETAIL,
      address: '12, Connaught Place, New Delhi',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      notes: 'Prefers deliveries on weekends.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Global Traders Group',
      mobile: '9888877777',
      email: 'contact@globaltraders.com',
      businessName: 'Global Traders Pvt Ltd',
      gstNumber: '27BBBBB2222B2Z2',
      customerType: CustomerType.WHOLESALE,
      address: '55, Bandra West, Mumbai',
      status: CustomerStatus.ACTIVE,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Prime Distributors LLC',
      mobile: '9999988888',
      email: 'support@primedist.com',
      businessName: 'Prime Distributors Ltd',
      gstNumber: '19CCCCC3333C3Z3',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Sector 5, Salt Lake, Kolkata',
      status: CustomerStatus.ACTIVE,
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      name: 'New Tech Ventures',
      mobile: '9123456789',
      email: 'hello@newtech.io',
      businessName: 'New Tech Ventures Startup',
      customerType: CustomerType.RETAIL,
      address: 'Indiranagar, Bengaluru',
      status: CustomerStatus.LEAD,
      notes: 'Initial contact made. Needs product brochure.',
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      name: 'Old Business Corp',
      mobile: '9000011111',
      email: 'info@oldbusiness.com',
      businessName: 'Old Company Ltd',
      customerType: CustomerType.WHOLESALE,
      address: 'A-4, Phase II, Noida',
      status: CustomerStatus.INACTIVE,
    },
  });

  console.log('👥 Created 5 sample customers of various types/statuses.');

  // Create follow-up CRM notes
  await prisma.customerFollowUpNote.createMany({
    data: [
      {
        customerId: customer1.id,
        authorId: sales.id,
        noteText: 'Called Aman. He wants to order LED TVs soon. Promised delivery in 3 days.',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        customerId: customer1.id,
        authorId: sales.id,
        noteText: 'Followed up via WhatsApp. He verified the pricing list.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        customerId: customer4.id,
        authorId: sales.id,
        noteText: 'Sent introductory catalog email. Waiting for response.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ],
  });

  console.log('📝 Created CRM follow-up notes for customers.');

  // 5. Create Products
  const prod1 = await prisma.product.create({
    data: {
      name: 'Smart LED TV 55"',
      sku: 'TV-SMART-01',
      category: 'Electronics',
      unitPrice: 450,
      currentStock: 15,
      minimumStockAlertQty: 5,
      location: 'Aisle A-1',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Bluetooth Speaker Portable',
      sku: 'SPK-BT-02',
      category: 'Electronics',
      unitPrice: 80,
      currentStock: 3, // Low Stock (Alert at 5)
      minimumStockAlertQty: 5,
      location: 'Aisle B-3',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      name: 'Ergonomic Office Chair',
      sku: 'CHR-OFF-03',
      category: 'Furniture',
      unitPrice: 120,
      currentStock: 50,
      minimumStockAlertQty: 10,
      location: 'Aisle C-2',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: 'Wireless Keyboard & Mouse',
      sku: 'KEY-WL-04',
      category: 'Electronics',
      unitPrice: 40,
      currentStock: 100,
      minimumStockAlertQty: 20,
      location: 'Aisle B-1',
    },
  });

  const prod5 = await prisma.product.create({
    data: {
      name: 'Industrial Desk Lamp',
      sku: 'LMP-DSK-05',
      category: 'Home Decor',
      unitPrice: 25,
      currentStock: 8, // Low Stock (Alert at 10)
      minimumStockAlertQty: 10,
      location: 'Aisle D-4',
    },
  });

  console.log('📦 Created 5 products (including SPK-BT-02 and LMP-DSK-05 as low stock).');

  // Create initial stock movement logs
  const productsList = [prod1, prod2, prod3, prod4, prod5];
  for (const p of productsList) {
    await prisma.stockMovementLog.create({
      data: {
        productId: p.id,
        qtyChanged: p.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial setup seed stock',
        createdById: warehouse.id,
      },
    });
  }

  // 6. Create Challans
  // Challan 1: Draft - Aman Gupta (Doesn't affect stock)
  await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0001',
      customerId: customer1.id,
      status: ChallanStatus.DRAFT,
      totalQuantity: 2,
      totalAmount: 900.0,
      createdById: sales.id,
      lineItems: {
        create: [
          {
            productId: prod1.id,
            quantity: 2,
            priceAtSale: prod1.unitPrice,
            productName: prod1.name,
            productSku: prod1.sku,
          },
        ],
      },
    },
  });

  // Challan 2: Confirmed - Global Traders (Should have already reduced stock from 15 to 14 for TV, and 50 to 48 for Chair)
  // Let's adjust seed stock so it reflects this confirmed transaction!
  // Update TV currentStock to 14, Chair currentStock to 48
  await prisma.product.update({
    where: { id: prod1.id },
    data: { currentStock: 14 },
  });
  await prisma.product.update({
    where: { id: prod3.id },
    data: { currentStock: 48 },
  });

  const confirmedChallan = await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0002',
      customerId: customer2.id,
      status: ChallanStatus.CONFIRMED,
      totalQuantity: 3,
      totalAmount: 690.0, // (1 * 450) + (2 * 120) = 450 + 240 = 690
      createdById: sales.id,
      lineItems: {
        create: [
          {
            productId: prod1.id,
            quantity: 1,
            priceAtSale: prod1.unitPrice,
            productName: prod1.name,
            productSku: prod1.sku,
          },
          {
            productId: prod3.id,
            quantity: 2,
            priceAtSale: prod3.unitPrice,
            productName: prod3.name,
            productSku: prod3.sku,
          },
        ],
      },
    },
  });

  // Log stock movement for confirmed challan
  await prisma.stockMovementLog.createMany({
    data: [
      {
        productId: prod1.id,
        qtyChanged: 1,
        movementType: MovementType.OUT,
        reason: `Sales Challan #${confirmedChallan.challanNumber} confirmation`,
        createdById: sales.id,
      },
      {
        productId: prod3.id,
        qtyChanged: 2,
        movementType: MovementType.OUT,
        reason: `Sales Challan #${confirmedChallan.challanNumber} confirmation`,
        createdById: sales.id,
      },
    ],
  });

  // Challan 3: Cancelled - Prime Distributors (Doesn't affect stock because it is cancelled)
  await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0003',
      customerId: customer3.id,
      status: ChallanStatus.CANCELLED,
      totalQuantity: 5,
      totalAmount: 200.0, // 5 * 40
      createdById: sales.id,
      lineItems: {
        create: [
          {
            productId: prod4.id,
            quantity: 5,
            priceAtSale: prod4.unitPrice,
            productName: prod4.name,
            productSku: prod4.sku,
          },
        ],
      },
    },
  });

  console.log('🧾 Created 3 challans: 1 DRAFT, 1 CONFIRMED (with associated stock reductions/logs), 1 CANCELLED.');

  // 7. Create ERP Inventories
  const inv1 = await prisma.inventory.create({
    data: {
      item: 'Smart LED TV 55"',
      category: 'Electronics',
      locationId: mainWarehouse.id,
      batch: 'B-TV01',
      physicalQuantity: 100,
      reservedQuantity: 30,
      damagedQuantity: 5,
    },
  });

  const inv2 = await prisma.inventory.create({
    data: {
      item: 'Ergonomic Office Chair',
      category: 'Furniture',
      locationId: mainWarehouse.id,
      batch: 'B-CHR01',
      physicalQuantity: 50,
      reservedQuantity: 10,
      damagedQuantity: 0,
    },
  });

  const inv3 = await prisma.inventory.create({
    data: {
      item: 'Smart LED TV 55"',
      category: 'Electronics',
      locationId: northDepot.id,
      batch: 'B-TV01',
      physicalQuantity: 60,
      reservedQuantity: 0,
      damagedQuantity: 0,
    },
  });

  const inv4 = await prisma.inventory.create({
    data: {
      item: 'Wireless Keyboard & Mouse',
      category: 'Electronics',
      locationId: northDepot.id,
      batch: 'B-KBD01',
      physicalQuantity: 200,
      reservedQuantity: 0,
      damagedQuantity: 0,
    },
  });

  console.log('📦 Created 4 ERP inventory items.');

  // Create initial transaction references (for idempotency)
  await prisma.inventoryTransaction.createMany({
    data: [
      {
        inventoryId: inv1.id,
        quantityChanged: 100,
        type: 'ADD',
        reference: 'INIT-INV1',
      },
      {
        inventoryId: inv2.id,
        quantityChanged: 50,
        type: 'ADD',
        reference: 'INIT-INV2',
      },
      {
        inventoryId: inv3.id,
        quantityChanged: 60,
        type: 'ADD',
        reference: 'INIT-INV3',
      },
      {
        inventoryId: inv4.id,
        quantityChanged: 200,
        type: 'ADD',
        reference: 'INIT-INV4',
      },
    ],
  });

  // 8. Create ERP Work Orders
  // Work Order 1: Assigned, shortage = 40 (since mainWarehouse only has 65 available LED TVs, but required is 105)
  await prisma.workOrder.create({
    data: {
      workOrderId: 'WO-2026-0001',
      locationId: mainWarehouse.id,
      inventoryId: inv1.id,
      requiredQuantity: 105,
      shortageQuantity: 40,
      assignedUserId: warehouse.id,
      status: WorkOrderStatus.ASSIGNED,
    },
  });

  // Work Order 2: In Progress, shortage = 0
  await prisma.workOrder.create({
    data: {
      workOrderId: 'WO-2026-0002',
      locationId: mainWarehouse.id,
      inventoryId: inv2.id,
      requiredQuantity: 30,
      shortageQuantity: 0,
      assignedUserId: warehouse.id,
      status: WorkOrderStatus.IN_PROGRESS,
    },
  });

  console.log('🛠 Created 2 ERP Work Orders.');

  // 9. Create ERP Stock Transfers
  // Transfer 1: Requested from North Depot to Main Warehouse for 40 TVs
  await prisma.internalTransfer.create({
    data: {
      transferId: 'TR-2026-0001',
      sourceLocationId: northDepot.id,
      destinationLocationId: mainWarehouse.id,
      inventoryId: inv3.id, // the TV inventory at North Depot
      quantity: 40,
      status: TransferStatus.REQUESTED,
    },
  });

  console.log('🚛 Created 1 ERP Internal Stock Transfer.');

  // 10. Create ERP Customer Orders
  // Customer Order 1: Reserved 15 TVs for Customer Aman Gupta
  await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-2026-0001',
      customerId: customer1.id,
      inventoryId: inv1.id,
      quantity: 15,
      status: CustomerOrderStatus.RESERVED,
    },
  });

  console.log('🛒 Created 1 ERP Customer Order reservation.');
  console.log('✅ Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
