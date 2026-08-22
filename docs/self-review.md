# ERP Self-Review & Interview Cheat-Sheet

This document contains a self-review of what was built, what was deferred, what could be improved, and a preparation cheat-sheet for the live technical interview.

---

## 1. What was built

- **Locations:** Created warehouse location support (`Location` model) and endpoints (`GET /api/erp/locations`, `POST /api/erp/locations`).
- **Multi-Location Inventory:** Created multi-location inventory support (`Inventory` model) with calculated available quantities (Physical - Reserved - Damaged) and automatic transaction logging (`InventoryTransaction` model).
- **Work Orders:** Added work orders with automatic material shortage calculation and transition validation (`Assigned -> In Progress -> Completed`).
- **Internal Stock Transfers:** Built dispatch/receipt flow (dispatch decrements source, receipt increments destination) with protection against double-receipt and full support for partial stock receipts (Scenario 2).
- **Customer Reservations:** Built order reservation module with **Atomic Conditional Update** row-locking concurrency control, including order cancellation stock release (Scenario 3).
- **Security Middleware:** Added role-based access validation (Admin, Warehouse/Operations, Sales) server-side.
- **Integration Tests:** Built 6 Vitest integration tests covering all business constraints and simulating high parallel reservation load.

---

## 2. What was deferred / Key Assumptions

- **Product Catalog Link:** We assumed ERP Inventories track materials using clear name strings and batches, decoupled from the CRM's product catalog details (since ERP needs specific batch-tracking and warehouses, whereas CRM products are general sales items).
- **Physical to Reserved validation outside Order flow:** We assumed that physical adjustments (e.g. manually reducing stock via adjust stock) are permitted but checked by Zod schemas and DB constraint checks to ensure physical stock does not drop below active reservations.

---

## 3. What would be improved with more time

- **FIFO/LIFO Auto-allocation:** When reserving stock, automate picking matching batches based on First-In-First-Out (FIFO) or nearest expiry logic rather than manual batch selection.
- **WebSocket updates:** Notify the Warehouse or Sales teams in real-time when a stock transfer dispatch occurs or a shortage is calculated.

---

## 4. Interview Cheat-Sheet: 3 Hardest Design Decisions

### Decision 1: Concurrency-Control Strategy on Reservations
- **Decision:** Atomic Conditional Update using Raw SQL in a Prisma transaction.
- **Why not standard Prisma?** A select-then-update in application code has a race condition. If two requests read at the same time, both think stock exists, and both write. Prisma's `update` doesn't let us put a custom `WHERE` clause comparing database columns (e.g., `WHERE physicalQuantity - reservedQuantity >= quantity`).
- **How it works:** We run:
  ```sql
  UPDATE "Inventory" SET "reservedQuantity" = "reservedQuantity" + :qty
  WHERE id = :id AND ("physicalQuantity" - "reservedQuantity" - "damagedQuantity") >= :qty
  ```
  PostgreSQL locks the row, performs the atomic calculation, and returns affected rows. If `0`, we reject with `409` and roll back. This guarantees 100% safety under parallel reservation load.

### Decision 2: DB-Level Check Constraints (Defense-in-Depth)
- **Decision:** Custom raw SQL migration script executing database-level constraints.
- **Why?** Zod validates incoming payloads, but it doesn't protect the database from manual query changes, database seeds, or other app modules.
- **How it works:** We enforce `chk_available_qty` (`physicalQuantity >= reservedQuantity + damagedQuantity`) in PostgreSQL. Any query attempting to make available stock negative throws a Postgres exception immediately.

### Decision 3: Partial Transfer Receipt Flow
- **Decision:** Multi-step status transition schema (`REQUESTED -> DISPATCHED -> PARTIALLY_RECEIVED -> RECEIVED`).
- **Why?** Real warehouses often receive damaged shipments or partial quantities due to truck capacity. Storing `dispatchedQuantity` and `receivedQuantity` enables workers to receive stock in increments.
