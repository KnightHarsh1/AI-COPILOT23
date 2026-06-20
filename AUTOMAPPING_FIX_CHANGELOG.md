# Auto-Mapping Fix — "0 / 8 mapped" Bug

## Root cause (proven against the exact failing file)
The column mapper only matched columns against the fields of the *detected*
document type. The detector's signatures were tuned for accounting-software
exports (Invoice Date, SKU, Sundry Debtors) and did not recognize everyday
business spreadsheets. A plain file with headers like
`OrderID, Date, City, Category, Product, Quantity, Price, Revenue` detected
as `unknown` → the mapper got an empty field list → 0/8 mapped.

Verified: 3 of 5 typical simple SME files (plain sales, e-commerce sales,
plain inventory) detected as `unknown` before the fix.

## What changed (all additive, no existing behavior removed)

1. **Broadened detector signatures** (`format_detector.py`) — sales,
   inventory, and customer signatures now recognize everyday vocabulary
   (revenue, sales, product, item, qty, price, order id, stock, etc.) and
   filename hints. Sales requires 2 header matches to avoid false positives
   against statements.

2. **Expanded synonym dictionary** (`canonical_field_dictionary.py`) — added
   everyday synonyms across sales/inventory and added retail sale fields
   (`product_name`, `quantity`, `unit_price`) so a sales line with product
   columns maps fully.

3. **Cross-type mapping with type inference** (`column_mapping_service.py`) —
   the decisive fix. When detection is `unknown` or low-confidence, the
   mapper now matches every column against the canonical fields of EVERY
   document type, then infers the document type from which type's fields
   won (weighted by required-field coverage). A plain
   `Date, Customer, Item, Qty, Amount` sheet that signature detection can't
   classify is now correctly inferred as sales and fully mapped.

4. **Orchestrator adopts the inferred type** (`orchestrator_service.py`) —
   when inference upgrades an unknown/low-confidence detection, the batch's
   document type and confidence are updated so downstream
   staging/normalization use the right type.

5. **UX** (`IngestionWizard.jsx`) — banner now reads "AI detected" and shows
   a green "Columns mapped automatically — just review and confirm" note
   when most columns auto-mapped, matching the intended upload experience.

## Results (end-to-end, tested against live logic)
| File | Before | After |
|---|---|---|
| Screenshot (OrderID…Revenue) | unknown, 0/8 | **sales, 8/8** |
| Plain sales (Date,Customer,Item,Qty,Amount) | unknown, 0/5 | **sales, 5/5** |
| Plain expense | expense, partial | expense, 4/4 |
| Inventory with SKU | ok | inventory, 4/4 |
| Customer list | ok | customer, 3/4 |

## Preserved (regression-tested, no breakage)
- Classic accounting exports (Invoice Date / Vendor / bank statements) still
  detect and map exactly as before (4/4, 4/4, 5/5).
- GST reports still route through their specialized path.
- KPI engine, Health Score, normalization, and the confirm-before-commit
  safety step are untouched. The new sales fields are safely ignored by the
  Sale insert (no schema change, no crash).
