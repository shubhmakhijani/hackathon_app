require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./db");

const insert = async (sql, params = [], client) => db.getOne(sql, params, client);
const get = async (sql, params = [], client) => db.getOne(sql, params, client);

const getOrCreate = async (table, matchCol, matchVal, insertSql, insertParams, client) => {
  const existing = await get(`SELECT id FROM ${table} WHERE ${matchCol} = $1`, [matchVal], client);
  if (existing) {
    return existing.id;
  }

  const created = await insert(insertSql, insertParams, client);
  return created.id;
};

const upsertStock = async (productId, locationId, qty, client) => {
  await db.query(
    `INSERT INTO stock_balances(product_id, location_id, qty)
     VALUES ($1, $2, 0)
     ON CONFLICT (product_id, location_id) DO NOTHING`,
    [productId, locationId],
    client
  );
  await db.query(
    "UPDATE stock_balances SET qty = qty + $1 WHERE product_id = $2 AND location_id = $3",
    [qty, productId, locationId],
    client
  );
};

const ledger = async (productId, locationId, delta, reason, refType, refId, client) => {
  await db.query(
    `INSERT INTO stock_ledger(product_id, location_id, change_qty, reason, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [productId, locationId, delta, reason, refType, refId],
    client
  );
};

const op = async (type, status, fields, items, client) => {
  const created = await insert(
    `INSERT INTO operations(type, status, supplier, customer, source_location_id, destination_location_id, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      type,
      status,
      fields.supplier || null,
      fields.customer || null,
      fields.src || null,
      fields.dst || null,
      fields.notes || null,
      fields.userId,
    ],
    client
  );

  for (const item of items) {
    await db.query(
      "INSERT INTO operation_items(operation_id, product_id, quantity) VALUES ($1, $2, $3)",
      [created.id, item.productId, item.qty],
      client
    );
  }

  return created.id;
};

async function seed() {
  await db.initDatabase();

  await db.withTransaction(async (client) => {
    let userId;
    const demoPasswordHash = bcrypt.hashSync("123456", 10);
    const existingUser = await get("SELECT id FROM users WHERE email = $1", ["shubhmak1333@gmail.com"], client);
    if (existingUser) {
      userId = existingUser.id;
      await db.query(
        "UPDATE users SET name = $1, password_hash = $2, role = 'manager' WHERE id = $3",
        ["SHUBH MAKHIJANI", demoPasswordHash, userId],
        client
      );
      console.log("  User already exists, refreshed demo credentials.");
    } else {
      const createdUser = await insert(
        `INSERT INTO users(name, email, password_hash, role)
         VALUES ($1, $2, $3, 'manager')
         RETURNING id`,
        ["SHUBH MAKHIJANI", "shubhmak1333@gmail.com", demoPasswordHash],
        client
      );
      userId = createdUser.id;
      console.log(`  Created user: SHUBH MAKHIJANI (id=${userId})`);
    }

    await getOrCreate(
      "warehouses",
      "name",
      "Main Warehouse",
      "INSERT INTO warehouses(name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      ["Main Warehouse"],
      client
    );
    await getOrCreate(
      "warehouses",
      "name",
      "Production Floor",
      "INSERT INTO warehouses(name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      ["Production Floor"],
      client
    );
    await getOrCreate(
      "warehouses",
      "name",
      "Storage Unit B",
      "INSERT INTO warehouses(name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      ["Storage Unit B"],
      client
    );

    const mwId = (await get("SELECT id FROM warehouses WHERE name = $1", ["Main Warehouse"], client)).id;
    const pfId = (await get("SELECT id FROM warehouses WHERE name = $1", ["Production Floor"], client)).id;
    const swId = (await get("SELECT id FROM warehouses WHERE name = $1", ["Storage Unit B"], client)).id;

    const ensureLoc = async (warehouseId, name) => {
      await db.query(
        `INSERT INTO locations(warehouse_id, name)
         VALUES ($1, $2)
         ON CONFLICT (warehouse_id, name) DO NOTHING`,
        [warehouseId, name],
        client
      );
      return (await get(
        "SELECT id FROM locations WHERE warehouse_id = $1 AND name = $2",
        [warehouseId, name],
        client
      )).id;
    };

    const locDefaultBin = await ensureLoc(mwId, "Default Bin");
    const locRackA = await ensureLoc(mwId, "Rack A");
    const locRackB = await ensureLoc(mwId, "Rack B");
    const locProdRack = await ensureLoc(pfId, "Production Rack");
    const locQualityZone = await ensureLoc(pfId, "Quality Zone");
    const locStorageShelve = await ensureLoc(swId, "Shelve 1");

    console.log("  Warehouses & locations ready.");

    const catIds = {};
    for (const name of ["Steel", "Furniture", "Electronics", "Packaging", "General"]) {
      await db.query(
        "INSERT INTO categories(name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [name],
        client
      );
      catIds[name] = (await get("SELECT id FROM categories WHERE name = $1", [name], client)).id;
    }
    console.log("  Categories ready.");

    const productDefs = [
      { name: "Steel Rods", sku: "STL-ROD-001", cat: "Steel", uom: "kg", reorder: 50 },
      { name: "Steel Sheets", sku: "STL-SHT-002", cat: "Steel", uom: "kg", reorder: 30 },
      { name: "Office Chairs", sku: "FRN-CHR-003", cat: "Furniture", uom: "pcs", reorder: 10 },
      { name: "Study Desks", sku: "FRN-DSK-004", cat: "Furniture", uom: "pcs", reorder: 5 },
      { name: "Industrial Bolts", sku: "PKG-BLT-005", cat: "Packaging", uom: "box", reorder: 20 },
      { name: "LED Panels", sku: "ELC-LED-006", cat: "Electronics", uom: "pcs", reorder: 8 },
      { name: "Cardboard Boxes", sku: "PKG-BOX-007", cat: "Packaging", uom: "pcs", reorder: 100 },
    ];

    const productIds = {};
    for (const product of productDefs) {
      await db.query(
        `INSERT INTO products(name, sku, category_id, unit_of_measure, reorder_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (sku) DO NOTHING`,
        [product.name, product.sku, catIds[product.cat], product.uom, product.reorder],
        client
      );
      productIds[product.name] = (await get("SELECT id FROM products WHERE sku = $1", [product.sku], client)).id;
    }
    console.log("  Products ready.");

    const initialStocks = [
      { productName: "Steel Rods", locationId: locRackA, qty: 200 },
      { productName: "Steel Sheets", locationId: locRackA, qty: 80 },
      { productName: "Office Chairs", locationId: locDefaultBin, qty: 60 },
      { productName: "Study Desks", locationId: locDefaultBin, qty: 25 },
      { productName: "Industrial Bolts", locationId: locRackB, qty: 150 },
      { productName: "LED Panels", locationId: locStorageShelve, qty: 30 },
      { productName: "Cardboard Boxes", locationId: locStorageShelve, qty: 400 },
    ];

    for (const stock of initialStocks) {
      const existingBalance = await get(
        "SELECT qty FROM stock_balances WHERE product_id = $1 AND location_id = $2",
        [productIds[stock.productName], stock.locationId],
        client
      );
      if (!existingBalance) {
        await upsertStock(productIds[stock.productName], stock.locationId, stock.qty, client);
        await ledger(productIds[stock.productName], stock.locationId, stock.qty, "Opening stock", "SEED", 0, client);
      }
    }
    console.log("  Initial stock set.");

    const hasReceipt1 = await get(
      "SELECT id FROM operations WHERE type = 'Receipt' AND supplier = $1 AND notes = $2 LIMIT 1",
      ["National Steel Corp", "Q1 steel procurement"],
      client
    );
    if (!hasReceipt1) {
      const op1Id = await op(
        "Receipt",
        "Done",
        { supplier: "National Steel Corp", dst: locRackA, notes: "Q1 steel procurement", userId },
        [
          { productId: productIds["Steel Rods"], qty: 100 },
          { productId: productIds["Steel Sheets"], qty: 50 },
        ],
        client
      );
      await upsertStock(productIds["Steel Rods"], locRackA, 100, client);
      await upsertStock(productIds["Steel Sheets"], locRackA, 50, client);
      await ledger(productIds["Steel Rods"], locRackA, 100, "Receipt validated", "Receipt", op1Id, client);
      await ledger(productIds["Steel Sheets"], locRackA, 50, "Receipt validated", "Receipt", op1Id, client);
    }

    const hasReceipt2 = await get(
      "SELECT id FROM operations WHERE type = 'Receipt' AND supplier = $1 AND notes = $2 LIMIT 1",
      ["FurnishWorld Pvt Ltd", "Large furniture batch – awaiting inspection"],
      client
    );
    if (!hasReceipt2) {
      await op(
        "Receipt",
        "Waiting",
        { supplier: "FurnishWorld Pvt Ltd", dst: locDefaultBin, notes: "Large furniture batch – awaiting inspection", userId },
        [
          { productId: productIds["Office Chairs"], qty: 30 },
          { productId: productIds["Study Desks"], qty: 15 },
        ],
        client
      );
    }

    const hasDelivery1 = await get(
      "SELECT id FROM operations WHERE type = 'Delivery' AND customer = $1 AND notes = $2 LIMIT 1",
      ["TechPark Solutions", "Sales order #SO-2026-001"],
      client
    );
    if (!hasDelivery1) {
      const op3Id = await op(
        "Delivery",
        "Done",
        { customer: "TechPark Solutions", src: locDefaultBin, notes: "Sales order #SO-2026-001", userId },
        [
          { productId: productIds["Office Chairs"], qty: 10 },
          { productId: productIds["Study Desks"], qty: 5 },
        ],
        client
      );
      await upsertStock(productIds["Office Chairs"], locDefaultBin, -10, client);
      await upsertStock(productIds["Study Desks"], locDefaultBin, -5, client);
      await ledger(productIds["Office Chairs"], locDefaultBin, -10, "Delivery validated", "Delivery", op3Id, client);
      await ledger(productIds["Study Desks"], locDefaultBin, -5, "Delivery validated", "Delivery", op3Id, client);
    }

    const hasDelivery2 = await get(
      "SELECT id FROM operations WHERE type = 'Delivery' AND customer = $1 AND notes = $2 LIMIT 1",
      ["BuildRight Contractors", "Bulk bolt order – ready for despatch"],
      client
    );
    if (!hasDelivery2) {
      await op(
        "Delivery",
        "Ready",
        { customer: "BuildRight Contractors", src: locRackB, notes: "Bulk bolt order – ready for despatch", userId },
        [{ productId: productIds["Industrial Bolts"], qty: 50 }],
        client
      );
    }

    const hasInternal1 = await get(
      "SELECT id FROM operations WHERE type = 'Internal' AND notes = $1 LIMIT 1",
      ["Feeding production line for week 12"],
      client
    );
    if (!hasInternal1) {
      const op5Id = await op(
        "Internal",
        "Done",
        { src: locRackA, dst: locProdRack, notes: "Feeding production line for week 12", userId },
        [{ productId: productIds["Steel Rods"], qty: 60 }],
        client
      );
      await upsertStock(productIds["Steel Rods"], locRackA, -60, client);
      await upsertStock(productIds["Steel Rods"], locProdRack, 60, client);
      await ledger(productIds["Steel Rods"], locRackA, -60, "Internal transfer out", "Internal", op5Id, client);
      await ledger(productIds["Steel Rods"], locProdRack, 60, "Internal transfer in", "Internal", op5Id, client);
    }

    const hasInternal2 = await get(
      "SELECT id FROM operations WHERE type = 'Internal' AND notes = $1 LIMIT 1",
      ["Quality check batch – LED Panels"],
      client
    );
    if (!hasInternal2) {
      await op(
        "Internal",
        "Draft",
        { src: locDefaultBin, dst: locQualityZone, notes: "Quality check batch – LED Panels", userId },
        [{ productId: productIds["LED Panels"], qty: 8 }],
        client
      );
    }

    const hasAdjustment1 = await get(
      "SELECT id FROM operations WHERE type = 'Adjustment' AND notes = $1 LIMIT 1",
      ["Damaged in transit – physical count corrected"],
      client
    );
    if (!hasAdjustment1) {
      const op7Id = await op(
        "Adjustment",
        "Done",
        { src: locRackA, notes: "Damaged in transit – physical count corrected", userId },
        [{ productId: productIds["Steel Rods"], qty: 0 }],
        client
      );
      await upsertStock(productIds["Steel Rods"], locRackA, -3, client);
      await ledger(productIds["Steel Rods"], locRackA, -3, "Stock adjustment – damage write-off", "Adjustment", op7Id, client);
    }

    const hasAdjustment2 = await get(
      "SELECT id FROM operations WHERE type = 'Adjustment' AND notes = $1 LIMIT 1",
      ["Physical count found 2 extra LED Panels"],
      client
    );
    if (!hasAdjustment2) {
      const op8Id = await op(
        "Adjustment",
        "Done",
        { src: locStorageShelve, notes: "Physical count found 2 extra LED Panels", userId },
        [{ productId: productIds["LED Panels"], qty: 32 }],
        client
      );
      await upsertStock(productIds["LED Panels"], locStorageShelve, 2, client);
      await ledger(productIds["LED Panels"], locStorageShelve, 2, "Stock adjustment – count surplus", "Adjustment", op8Id, client);
    }

    console.log("  Operations & ledger entries created.");
    console.log("\n✅  Seed complete!");
    console.log("   Login → email: shubhmak1333@gmail.com  |  password: 123456");
  });
}

seed()
  .then(() => db.closePool())
  .catch(async (error) => {
    console.error("Seed failed:", error.message);
    await db.closePool();
    process.exit(1);
  });
