import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDemo() {
  console.log('=== STARTING LIVE ERP WORKFLOW DEMO ===\n');

  // 1. Fetch default locations
  console.log('1. Fetching warehouse locations...');
  const locations = await prisma.location.findMany();
  console.log(`Found locations: ${locations.map(l => l.name).join(', ')}\n`);

  let mumLocation = locations.find(l => l.name.includes('Mumbai'));
  let delhiLocation = locations.find(l => l.name.includes('Delhi'));

  if (!mumLocation || !delhiLocation) {
    console.log('Seeding missing locations...');
    mumLocation = await prisma.location.create({ data: { name: 'Mumbai Central Warehouse' } });
    delhiLocation = await prisma.location.create({ data: { name: 'Delhi NCR Depot' } });
  }

  // 2. Adjust Stock Level (Mumbai Central)
  console.log('2. Adjusting inventory stock levels...');
  const item = '4K Ultra HD Projector';
  const batch = 'B-PROJ-09';
  
  let inventory = await prisma.inventory.findFirst({
    where: { item, locationId: mumLocation.id, batch }
  });

  if (!inventory) {
    inventory = await prisma.inventory.create({
      data: {
        item,
        category: 'Electronics',
        locationId: mumLocation.id,
        batch,
        physicalQuantity: 100,
        reservedQuantity: 0,
        damagedQuantity: 0
      }
    });
  } else {
    inventory = await prisma.inventory.update({
      where: { id: inventory.id },
      data: { physicalQuantity: 100 }
    });
  }

  if (!inventory) {
    throw new Error('Failed to create/update inventory row.');
  }

  console.log(`Inventory adjusted: "${item}" (Batch: ${batch}) at ${mumLocation.name}`);
  console.log(`Current Stock - Physical: ${inventory.physicalQuantity}, Reserved: ${inventory.reservedQuantity}, Damaged: ${inventory.damagedQuantity}`);
  console.log(`Calculated Available Quantity: ${inventory.physicalQuantity - inventory.reservedQuantity - inventory.damagedQuantity}\n`);

  // 3. Log Damaged Stock
  console.log('3. Logging damaged stock (Scenario 1: Damaged stock reduces Available)...');
  inventory = await prisma.inventory.update({
    where: { id: inventory.id },
    data: { damagedQuantity: 10 }
  }) as any;

  if (!inventory) {
    throw new Error('Failed to update inventory row for damages.');
  }

  console.log(`Logged 10 damaged units of "${item}"`);
  console.log(`Current Stock - Physical: ${inventory.physicalQuantity}, Reserved: ${inventory.reservedQuantity}, Damaged: ${inventory.damagedQuantity}`);
  console.log(`Calculated Available Quantity: ${inventory.physicalQuantity - inventory.reservedQuantity - inventory.damagedQuantity}\n`);

  // 4. Create Customer Reservation (Scenario 3: Atomic Concurrency Check)
  console.log('4. Performing concurrency-safe Customer stock reservation...');
  const customer = await prisma.customer.findFirst();
  if (!customer) {
    throw new Error('No seeded customers found to attach order reservation.');
  }

  const orderNumber = `ORD-DEMO-${Date.now().toString().slice(-4)}`;
  const reserveQty = 30;

  // Run atomic raw update
  const affected = await prisma.$executeRawUnsafe(
    `UPDATE "Inventory" 
     SET "reservedQuantity" = "reservedQuantity" + $1 
     WHERE id = $2 AND ("physicalQuantity" - "reservedQuantity" - "damagedQuantity") >= $1`,
    reserveQty,
    inventory.id
  );

  if (affected === 0) {
    throw new Error('Concurrency reservation failed: Insufficient available stock.');
  }

  const order = await prisma.customerOrder.create({
    data: {
      orderNumber,
      customerId: customer.id,
      inventoryId: inventory.id,
      quantity: reserveQty,
      status: 'RESERVED'
    }
  });

  // Re-fetch inventory
  inventory = await prisma.inventory.findUnique({ where: { id: inventory.id } }) as any;
  if (!inventory) {
    throw new Error('Failed to fetch inventory row after reservation.');
  }

  console.log(`Created reservation order "${orderNumber}" for customer "${customer.name}" with quantity: ${reserveQty}`);
  console.log(`Current Stock - Physical: ${inventory.physicalQuantity}, Reserved: ${inventory.reservedQuantity}, Damaged: ${inventory.damagedQuantity}`);
  console.log(`Calculated Available Quantity: ${inventory.physicalQuantity - inventory.reservedQuantity - inventory.damagedQuantity}\n`);

  // 5. Internal Stock Transfer (Scenario 2: Partial receipts)
  console.log('5. Triggering Internal Stock Transfer from Mumbai to Delhi...');
  const transferId = `TR-DEMO-${Date.now().toString().slice(-4)}`;
  const transferQty = 40;

  // Create Transfer Request
  let transfer = await prisma.internalTransfer.create({
    data: {
      transferId,
      sourceLocationId: mumLocation.id,
      destinationLocationId: delhiLocation.id,
      inventoryId: inventory.id,
      quantity: transferQty,
      status: 'REQUESTED'
    }
  });
  console.log(`Transfer requested: "${transferId}" of ${transferQty} units from Mumbai to Delhi.`);

  // Dispatch Transfer
  inventory = await prisma.inventory.findUnique({ where: { id: inventory.id } }) as any;
  if (!inventory) {
    throw new Error('Failed to fetch inventory row before dispatch.');
  }

  if (inventory.physicalQuantity < transferQty) {
    throw new Error('Insufficient physical stock to dispatch transfer.');
  }

  // Transaction wrapped dispatch
  await prisma.$transaction([
    prisma.inventory.update({
      where: { id: inventory.id },
      data: { physicalQuantity: { decrement: transferQty } }
    }),
    prisma.internalTransfer.update({
      where: { id: transfer.id },
      data: { status: 'DISPATCHED' }
    }),
    prisma.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        quantityChanged: -transferQty,
        type: 'TRANSFER_OUT',
        reference: `OUT-${transferId}-${Date.now()}`
      }
    })
  ]);
  console.log(`Transfer dispatched! Mumbai physical stock decremented by ${transferQty}.`);

  // Re-fetch source inventory
  inventory = await prisma.inventory.findUnique({ where: { id: inventory.id } }) as any;
  if (!inventory) {
    throw new Error('Failed to fetch inventory row after dispatch.');
  }
  console.log(`Mumbai Stock - Physical: ${inventory.physicalQuantity}, Reserved: ${inventory.reservedQuantity}, Damaged: ${inventory.damagedQuantity}\n`);

  // Partially Receive Transfer (e.g., receive 25 units out of 40)
  console.log('6. Executing partial receipt (Scenario 2: Receive 25 units first)...');
  const partialQty = 25;

  // Find or create inventory row at destination location
  let destInventory = await prisma.inventory.findFirst({
    where: { item, locationId: delhiLocation.id, batch }
  });

  if (!destInventory) {
    destInventory = await prisma.inventory.create({
      data: {
        item,
        category: 'Electronics',
        locationId: delhiLocation.id,
        batch,
        physicalQuantity: 0,
        reservedQuantity: 0,
        damagedQuantity: 0
      }
    });
  }

  // Update in transaction
  await prisma.$transaction([
    prisma.inventory.update({
      where: { id: destInventory!.id },
      data: { physicalQuantity: { increment: partialQty } }
    }),
    prisma.internalTransfer.update({
      where: { id: transfer.id },
      data: {
        receivedQuantity: { increment: partialQty },
        status: 'PARTIALLY_RECEIVED'
      }
    }),
    prisma.inventoryTransaction.create({
      data: {
        inventoryId: destInventory!.id,
        quantityChanged: partialQty,
        type: 'TRANSFER_IN',
        reference: `IN-${transferId}-${Date.now()}`
      }
    })
  ]);
  console.log(`Partially received ${partialQty} units at Delhi!`);
  destInventory = await prisma.inventory.findUnique({ where: { id: destInventory!.id } }) as any;
  if (!destInventory) {
    throw new Error('Failed to fetch destination inventory row after receipt.');
  }
  console.log(`Delhi Stock - Physical: ${destInventory.physicalQuantity}, Reserved: ${destInventory.reservedQuantity}, Damaged: ${destInventory.damagedQuantity}\n`);

  // 7. Work Order with shortage auto-calculation
  console.log('7. Creating Work Order with automated shortage calculation...');
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found to assign work order.');
  }

  const workOrderId = `WO-DEMO-${Date.now().toString().slice(-4)}`;
  const woRequiredQty = 50; // Delhi only has 25 physical stock, so it should trigger a shortage!

  // Check available stock at Delhi
  const destAvailable = destInventory.physicalQuantity - destInventory.reservedQuantity - destInventory.damagedQuantity;
  const shortage = Math.max(0, woRequiredQty - destAvailable);

  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderId,
      locationId: delhiLocation.id,
      inventoryId: destInventory.id,
      requiredQuantity: woRequiredQty,
      shortageQuantity: shortage,
      assignedUserId: user.id,
      status: 'ASSIGNED'
    }
  });

  console.log(`Work Order "${workOrderId}" staged at Delhi Depot.`);
  console.log(`Required Quantity: ${woRequiredQty}, Available Stock: ${destAvailable}`);
  console.log(`Automated Shortage Quantity Calculated: ${workOrder.shortageQuantity} units short!`);
  
  console.log('\n=== LIVE ERP WORKFLOW DEMO COMPLETED SUCCESSFULLY ===');
}

runDemo()
  .catch((err) => {
    console.error('Error running live demo workflow:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
