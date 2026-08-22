# Known Limitations & Assumptions

This document lists key assumptions and known limitations of the Mini Operations ERP system.

---

## 1. Assumptions

- **Item Tracking:** ERP items are tracked by unique `(item, locationId, batch)` records in the `Inventory` table. This allows different batches of the same material to coexist in different quantities at the same warehouse location.
- **Shortage Recalculation:** Material shortages for Work Orders are computed at creation time based on the available inventory at the specified location.
- **Damaged Stock:** Damaged stock represents items that are physically present in the warehouse but unusable. Thus, `damagedQuantity` reduces the derived `Available` quantity, while remaining part of the overall `Physical` quantity count.
- **User Location Restrictions:** The `User` model has a nullable `locationId` relation. This allows the schema to support assigning users to specific locations (Scenario 4) without breaking existing organization seed accounts (who have full access across all locations by default).

---

## 2. Known Limitations

- **Automatic Shortage Updates:** If inventory stock increases after a Work Order is created, the Work Order's `shortageQuantity` is not automatically re-calculated in real-time unless re-queried or updated.
- **Transfers between non-existent items:** An internal transfer dispatch requires the item to exist at the source location. However, it does not require the item to exist at the destination location beforehand; the system will automatically create a matching `Inventory` record with `0` stock at the destination warehouse upon receipt.
