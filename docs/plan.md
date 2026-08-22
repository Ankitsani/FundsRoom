# Proposed Mini Operations ERP Plan

This document outlines the Prisma schema additions, API routes, role authorization, and concurrency controls designed for the Mini Operations ERP.

## 1. Schema Additions

```prisma
enum WorkOrderStatus {
  ASSIGNED
  IN_PROGRESS
  COMPLETED
}

enum TransferStatus {
  REQUESTED
  DISPATCHED
  PARTIALLY_RECEIVED
  RECEIVED
}

enum CustomerOrderStatus {
  RESERVED
  COMPLETED
  CANCELLED
}

// In User model:
//   locationId      String?
//   location        Location?            @relation(fields: [locationId], references: [id])
//   workOrders      WorkOrder[]

// In Customer model:
//   customerOrders  CustomerOrder[]

model Location {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  inventories          Inventory[]
  workOrders           WorkOrder[]
  sourceTransfers      InternalTransfer[] @relation("SourceLocation")
  destinationTransfers InternalTransfer[] @relation("DestinationLocation")
  users                User[]
}

model Inventory {
  id               String   @id @default(uuid())
  item             String
  category         String
  locationId       String
  location         Location @relation(fields: [locationId], references: [id])
  batch            String
  physicalQuantity Int      @default(0)
  reservedQuantity Int      @default(0)
  damagedQuantity  Int      @default(0) // Scenario 1: Damaged stock
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  workOrders       WorkOrder[]
  transfers        InternalTransfer[] @relation("TransferInventory")
  customerOrders   CustomerOrder[]
  transactions     InventoryTransaction[]

  @@unique([item, locationId, batch])
}

model InventoryTransaction {
  id              String    @id @default(uuid())
  inventoryId     String
  inventory       Inventory @relation(fields: [inventoryId], references: [id])
  quantityChanged Int
  type            String    // "ADD", "SUBTRACT", "RESERVE", "RELEASE", "DAMAGE", "UNDAMAGE"
  reference       String    @unique // Idempotency reference key
  createdAt       DateTime  @default(now())
}

model WorkOrder {
  id               String          @id @default(uuid())
  workOrderId      String          @unique
  locationId       String
  location         Location        @relation(fields: [locationId], references: [id])
  inventoryId      String
  inventory        Inventory       @relation(fields: [inventoryId], references: [id])
  requiredQuantity Int
  shortageQuantity Int             @default(0)
  assignedUserId   String
  assignedUser     User            @relation(fields: [assignedUserId], references: [id])
  status           WorkOrderStatus @default(ASSIGNED)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}

model InternalTransfer {
  id                    String         @id @default(uuid())
  transferId            String         @unique
  sourceLocationId      String
  sourceLocation        Location       @relation("SourceLocation", fields: [sourceLocationId], references: [id])
  destinationLocationId String
  destinationLocation   Location       @relation("DestinationLocation", fields: [destinationLocationId], references: [id])
  inventoryId           String
  inventory             Inventory      @relation("TransferInventory", fields: [inventoryId], references: [id])
  quantity              Int
  dispatchedQuantity    Int?
  receivedQuantity      Int            @default(0) // Scenario 2: Partial receipt
  status                TransferStatus @default(REQUESTED)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
}

model CustomerOrder {
  id          String              @id @default(uuid())
  orderNumber String              @unique
  customerId  String
  customer    Customer            @relation(fields: [customerId], references: [id])
  inventoryId String
  inventory   Inventory           @relation(fields: [inventoryId], references: [id])
  quantity    Int
  status      CustomerOrderStatus @default(RESERVED)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}
```

## 2. API Routes

### Locations
- `GET /api/erp/locations` (Admin, Sales, Warehouse, Accounts)
- `POST /api/erp/locations` (Admin)

### Inventory
- `GET /api/erp/inventory` (Admin, Sales, Warehouse, Accounts)
- `POST /api/erp/inventory` (Admin, Warehouse)
- `POST /api/erp/inventory/damaged` (Admin, Warehouse) — Scenario 1

### Work Orders
- `GET /api/erp/work-orders` (Admin, Sales, Warehouse, Accounts)
- `POST /api/erp/work-orders` (Admin)
- `PATCH /api/erp/work-orders/:id/status` (Admin)

### Internal Transfers
- `GET /api/erp/transfers` (Admin, Sales, Warehouse, Accounts)
- `POST /api/erp/transfers` (Admin, Warehouse)
- `POST /api/erp/transfers/:id/dispatch` (Admin, Warehouse)
- `POST /api/erp/transfers/:id/receive` (Admin, Warehouse) — Scenario 2 (partial receipt)

### Customer Orders
- `GET /api/erp/orders` (Admin, Sales, Warehouse, Accounts)
- `POST /api/erp/orders` (Admin, Sales) — Concurrency control enabled
- `POST /api/erp/orders/:id/cancel` (Admin, Sales) — Scenario 3

## 3. Concurrency Strategy
We use **Atomic Conditional Update** inside database transactions using raw SQL (`$executeRaw`). This checks available quantity during write, ensuring absolute correctness under parallel execution.
