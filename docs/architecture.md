# System Architecture — Mini ERP + CRM Portal

This document explains the architecture of the Mini ERP + CRM Operations Portal.

---

## 1. Directory Structure

The project is structured as a monorepo with separate `backend` (Express.js, TypeScript, Prisma) and `frontend` (React, Vite, TypeScript, Tailwind CSS) components:

- **/backend**: Core business service and API server.
  - `/prisma`: Relational database schema definition (`schema.prisma`) and default data seeder (`seed.ts`).
  - `/src/middleware`: Global request validation, role authorization, and centralized error parsing.
  - `/src/modules`: Modular backend layers divided by domains:
    - `auth`: Credentials verification and JWT signing.
    - `customers`: CRM client profiles and follow-up activities.
    - `products`: Product catalogs and inventory logs.
    - `challans`: Transaction-based delivery challans.
- **/frontend**: Client UI built with React + Vite.
  - `/src/api`: Typed REST API client wrapping fetch operations.
  - `/src/context`: Authentication session wrapper (`AuthContext.tsx`).
  - `/src/components`: Layout widgets, sidebar drawer, protected routes, and custom notification toasts.
  - `/src/pages`: Functional views (Dashboard, Customers directory, Product list, and Challan invoices).
- **/docs**: Setup, testing, and architecture documentation.

---

## 2. Request & Authentication Flow

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant AuthMW as Auth Middleware
    participant RoleMW as Role Middleware
    participant Controller as Domain Controller
    participant DB as Postgres Database

    Client->>AuthMW: Send HTTP Request with Bearer Token
    alt Token Missing/Expired
        AuthMW-->>Client: Return 401 Unauthorized Error
    else Token Valid
        AuthMW->>AuthMW: Decode payload and attach req.user
        AuthMW->>RoleMW: Pass control
    end

    alt Role not allowed
        RoleMW-->>Client: Return 403 Forbidden Error
    else Role allowed
        RoleMW->>Controller: Pass control
        Controller->>DB: Query/Update tables
        DB-->>Controller: Return query results
        Controller-->>Client: Return 200/201 Success Response ({ data })
    end
```

---

## 3. Database Schema

The database uses PostgreSQL with the following core tables:

1. **User**: Stores employee email, password hashes (bcryptjs), and roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
2. **Customer**: CRM business data, types (`RETAIL`, `WHOLESALE`, `DISTRIBUTOR`), statuses (`LEAD`, `ACTIVE`, `INACTIVE`), and follow-up notes.
3. **CustomerFollowUpNote**: Chronological text notes mapped to customers, tracking the author (User) and timestamps.
4. **Product**: Catalog records holding unique SKUs, categories, pricing, current inventory levels, and low-stock alert thresholds.
5. **StockMovementLog**: Audit trail tracking all inventory changes (Manual stock adjustments, seed imports, or Sales Challan confirmations).
6. **Challan**: Sales delivery records tracking customer, total cost, total quantity, and statuses (`DRAFT`, `CONFIRMED`, `CANCELLED`).
7. **ChallanLineItem**: Items sold. Stores a product snapshot (`productName`, `productSku`, `priceAtSale`) alongside the `productId` to guarantee invoice integrity if products are edited in the future.

---

## 4. Transaction & Inventory Allocation Logic

One of the core requirements is ensuring that stock never goes negative and historical sales challans remain unmodified when product prices or names change.

### Stock SNAPSHOT Design
When a Challan is generated, the catalog `name`, `sku`, and current `unitPrice` are duplicated directly into the `ChallanLineItem` record as a snapshot. If a product is updated later (e.g. its price changes), previous invoices retrieve snapshot data rather than querying active catalog rows, preserving financial audit accuracy.

### DRAFT / CONFIRMED / CANCELLED States
- **Draft:** Creating a Draft Challan does not decrement stock or write movement logs. It is a staging state.
- **Confirmed:** Converting a Draft to Confirmed or creating a Confirmed Challan triggers a database transaction that:
  1. Compares requested quantities against available stock in the database.
  2. If any items have insufficient quantities, the transaction aborts (releasing locks) and returns a `409 Conflict` status identifying the short items.
  3. If stock is sufficient, it decrements stock sequentially using a conditional where statement (`where: { id: productId, currentStock: { gte: quantity } }`). This double checks that stock levels didn't change mid-execution, preventing race conditions.
  4. Writes stock movement logs (Movement: `OUT`, Reason: "Sales Challan #CH-YYYY-XXXX").
  5. Updates Challan status to `CONFIRMED`.
- **Cancelled:** Cancelling a Confirmed challan performs a restock operation in a transaction:
  1. Increments product stocks by original line item quantities.
  2. Writes stock movement logs (Movement: `IN`, Reason: "Restocked from Cancelled Sales Challan #CH-YYYY-XXXX").
  3. Updates Challan status to `CANCELLED`.

---

## 5. Mini Operations ERP Architecture

We introduced a second domain to the ERP, supporting multi-location inventory, work orders with automated shortage tracking, internal stock transfers (with partial receipt), and concurrency-safe customer order reservations.

### ER Diagram (Mermaid)

```mermaid
classDiagram
    direction TB
    class Location {
        id String
        name String
    }
    class User {
        id String
        role Role
        locationId String
    }
    class Inventory {
        id String
        item String
        category String
        locationId String
        physicalQuantity Int
        reservedQuantity Int
        damagedQuantity Int
    }
    class WorkOrder {
        id String
        workOrderId String
        locationId String
        inventoryId String
        requiredQuantity Int
        shortageQuantity Int
        assignedUserId String
        status WorkOrderStatus
    }
    class InternalTransfer {
        id String
        transferId String
        sourceLocationId String
        destinationLocationId String
        inventoryId String
        quantity Int
        receivedQuantity Int
        status TransferStatus
    }
    class CustomerOrder {
        id String
        orderNumber String
        customerId String
        inventoryId String
        quantity Int
        status CustomerOrderStatus
    }

    Location "1" *-- "many" User : "assigns"
    Location "1" *-- "many" Inventory : "houses"
    Location "1" *-- "many" WorkOrder : "stages"
    Location "1" *-- "many" InternalTransfer : "dispatches (Source)"
    Location "1" *-- "many" InternalTransfer : "receives (Destination)"
    User "1" *-- "many" WorkOrder : "assigned to"
    Inventory "1" *-- "many" WorkOrder : "requires material"
    Inventory "1" *-- "many" InternalTransfer : "transfers stock"
    Inventory "1" *-- "many" CustomerOrder : "allocates stock"
    Customer "1" *-- "many" CustomerOrder : "buys"
```

### Concurrency-Control Strategy (§7)

Under high load, concurrent customer stock reservations could exceed available stock, leading to negative inventory or double-booking. To solve this correctly at the database level:
- **Design Decision:** We chose the **Atomic Conditional Update** pattern using raw SQL (`$executeRaw`).
- **Justification:** Prisma's standard `update` API fetches a record first and updates it in memory before writing back, creating a race condition. Prisma's `updateMany` doesn't support comparing multiple database columns dynamically (e.g. `physicalQuantity - reservedQuantity - damagedQuantity >= quantity`).
- **Implementation:** We run a raw update query at the engine level:
  ```sql
  UPDATE "Inventory"
  SET "reservedQuantity" = "reservedQuantity" + :qty
  WHERE id = :id AND ("physicalQuantity" - "reservedQuantity" - "damagedQuantity") >= :qty
  ```
  PostgreSQL locks the row for this update and evaluates the condition. If the condition is met, it increments the reservation and returns `1` affected row. If not met, it returns `0` affected rows.
- **Transactional Safety:** If the query returns `0`, we roll back the transaction and return a `409 Conflict` error to the user, guaranteeing that stock reservations never exceed actual available levels.

### Defense-In-Depth Database Constraints

To prevent negative stock, we wrote raw SQL constraints at the PostgreSQL engine level in `backend/src/setup-db.ts`:
1. `chk_physical_qty`: `physicalQuantity >= 0`
2. `chk_reserved_qty`: `reservedQuantity >= 0`
3. `chk_damaged_qty`: `damagedQuantity >= 0`
4. `chk_available_qty`: `physicalQuantity >= (reservedQuantity + damagedQuantity)`

Any application bug or manual database edit attempting to breach these rules is rejected immediately by the PostgreSQL database engine.
