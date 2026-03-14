require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const MAX_BODY_SIZE = "200kb";
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 30;
const authAttempts = new Map();
const sseClients = new Set();

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json({ limit: MAX_BODY_SIZE }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : value);
const isUniqueViolation = (error) => error && error.code === "23505";

const toValidationError = (parsed) => {
  const issues = parsed.error.issues.map((issue) => ({
    field: issue.path.join(".") || "payload",
    message: issue.message,
  }));
  return { message: "Validation failed", issues };
};

const withSchema = (schema, payload) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: toValidationError(parsed) };
  }
  return { ok: true, data: parsed.data };
};

const authRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const bucket = authAttempts.get(key);

  if (!bucket || now - bucket.startedAt > AUTH_WINDOW_MS) {
    authAttempts.set(key, { count: 1, startedAt: now });
    return next();
  }

  if (bucket.count >= AUTH_MAX_ATTEMPTS) {
    return res.status(429).json({ message: "Too many auth attempts. Try again later." });
  }

  bucket.count += 1;
  return next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of authAttempts.entries()) {
    if (now - bucket.startedAt > AUTH_WINDOW_MS) {
      authAttempts.delete(key);
    }
  }
}, AUTH_WINDOW_MS).unref();

const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = auth.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const streamAuthMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  const queryToken = req.query.token;
  const token = auth && auth.startsWith("Bearer ") ? auth.split(" ")[1] : queryToken;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const getOrCreateStock = async (productId, locationId, client) => {
  await db.query(
    `INSERT INTO stock_balances(product_id, location_id, qty)
     VALUES ($1, $2, 0)
     ON CONFLICT (product_id, location_id) DO NOTHING`,
    [productId, locationId],
    client
  );

  return db.getOne(
    "SELECT * FROM stock_balances WHERE product_id = $1 AND location_id = $2",
    [productId, locationId],
    client
  );
};

const writeLedger = async (productId, locationId, changeQty, reason, referenceType, referenceId, client) => {
  await db.query(
    `INSERT INTO stock_ledger(product_id, location_id, change_qty, reason, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [productId, locationId, changeQty, reason, referenceType, referenceId],
    client
  );
};

const broadcast = (event, payload = {}) => {
  const message = `event: ${event}\ndata: ${JSON.stringify({ ...payload, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
};

setInterval(() => {
  const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    client.write(heartbeat);
  }
}, 25000).unref();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: "postgres" });
});

app.get("/api/stream", streamAuthMiddleware, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  sseClients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ userId: req.user.id, ts: Date.now() })}\n\n`);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

app.post("/api/auth/signup", authRateLimit, asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128),
  });

  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const { name, email, password } = parsed.data;
  const existing = await db.getOne("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hash = bcrypt.hashSync(password, 10);
  const created = await db.getOne(
    `INSERT INTO users(name, email, password_hash, role)
     VALUES ($1, $2, $3, 'manager')
     RETURNING id`,
    [name, email, hash]
  );

  const token = jwt.sign({ id: created.id, name, email, role: "manager" }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: created.id, name, email, role: "manager" } });
}));

app.post("/api/auth/login", authRateLimit, asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(128),
  });
  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const { email, password } = parsed.data;
  const user = await db.getOne("SELECT * FROM users WHERE email = $1", [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

app.post("/api/auth/request-reset", authRateLimit, asyncHandler(async (req, res) => {
  const schema = z.object({ email: z.email().trim().toLowerCase() });
  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const user = await db.getOne("SELECT * FROM users WHERE email = $1", [parsed.data.email]);
  if (!user) {
    return res.json({ message: "If that email exists, OTP is sent." });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.query("INSERT INTO otps(user_id, code, expires_at, used) VALUES ($1, $2, $3, FALSE)", [user.id, otp, expiresAt]);

  console.log(`OTP for ${user.email}: ${otp}`);
  return res.json({ message: "OTP generated. Use it to reset password.", otpDemo: otp });
}));

app.post("/api/auth/reset-password", authRateLimit, asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.email().trim().toLowerCase(),
    otp: z.string().length(6),
    newPassword: z.string().min(8).max(128),
  });

  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const { email, otp, newPassword } = parsed.data;
  const user = await db.getOne("SELECT * FROM users WHERE email = $1", [email]);
  if (!user) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const otpRow = await db.getOne(
    `SELECT *
     FROM otps
     WHERE user_id = $1 AND code = $2 AND used = FALSE
     ORDER BY id DESC
     LIMIT 1`,
    [user.id, otp]
  );

  if (!otpRow || new Date(otpRow.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.withTransaction(async (client) => {
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, user.id], client);
    await db.query("UPDATE otps SET used = TRUE WHERE id = $1", [otpRow.id], client);
  });

  return res.json({ message: "Password reset successful" });
}));

app.get("/api/profile", authMiddleware, asyncHandler(async (req, res) => {
  const user = await db.getOne("SELECT id, name, email, role, created_at FROM users WHERE id = $1", [req.user.id]);
  return res.json(user);
}));

app.get("/api/warehouses", authMiddleware, asyncHandler(async (_req, res) => {
  const rows = await db.getMany(
    `SELECT w.id, w.name, w.created_at,
            COUNT(l.id) AS location_count
     FROM warehouses w
     LEFT JOIN locations l ON l.warehouse_id = w.id
     GROUP BY w.id, w.name, w.created_at
     ORDER BY w.id DESC`
  );
  res.json(rows);
}));

app.post("/api/warehouses", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().trim().min(2).max(120) });
  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  try {
    const name = normalizeText(parsed.data.name);
    const row = await db.getOne("INSERT INTO warehouses(name) VALUES ($1) RETURNING id", [name]);
    res.json({ id: row.id, name });
    broadcast("warehouse.changed", { action: "created", id: row.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: "Warehouse already exists" });
    }
    throw error;
  }
}));

app.get("/api/locations", authMiddleware, asyncHandler(async (req, res) => {
  const warehouseId = req.query.warehouseId;
  const rows = warehouseId
    ? await db.getMany(
        `SELECT l.id, l.name, l.warehouse_id, w.name AS warehouse_name
         FROM locations l
         JOIN warehouses w ON w.id = l.warehouse_id
         WHERE l.warehouse_id = $1
         ORDER BY l.id DESC`,
        [warehouseId]
      )
    : await db.getMany(
        `SELECT l.id, l.name, l.warehouse_id, w.name AS warehouse_name
         FROM locations l
         JOIN warehouses w ON w.id = l.warehouse_id
         ORDER BY l.id DESC`
      );

  res.json(rows);
}));

app.post("/api/locations", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({ warehouseId: z.coerce.number().int().positive(), name: z.string().trim().min(2).max(120) });
  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  try {
    const name = normalizeText(parsed.data.name);
    const row = await db.getOne(
      "INSERT INTO locations(warehouse_id, name) VALUES ($1, $2) RETURNING id",
      [parsed.data.warehouseId, name]
    );
    res.json({ id: row.id, name, warehouseId: parsed.data.warehouseId });
    broadcast("location.changed", { action: "created", id: row.id, warehouseId: parsed.data.warehouseId });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: "Location already exists in this warehouse" });
    }
    throw error;
  }
}));

app.get("/api/categories", authMiddleware, asyncHandler(async (_req, res) => {
  const rows = await db.getMany("SELECT * FROM categories ORDER BY name ASC");
  res.json(rows);
}));

app.post("/api/categories", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().trim().min(2).max(80) });
  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  try {
    const name = normalizeText(parsed.data.name);
    const row = await db.getOne("INSERT INTO categories(name) VALUES ($1) RETURNING id", [name]);
    res.json({ id: row.id, name });
    broadcast("category.changed", { action: "created", id: row.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: "Category already exists" });
    }
    throw error;
  }
}));

app.get("/api/products", authMiddleware, asyncHandler(async (req, res) => {
  const categoryId = req.query.categoryId;
  const locationId = req.query.locationId;

  let sql = `
    SELECT p.id, p.name, p.sku, p.unit_of_measure, p.reorder_level, p.created_at,
           c.name AS category_name,
           COALESCE(SUM(sb.qty), 0) AS total_stock
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN stock_balances sb ON sb.product_id = p.id
  `;

  const where = [];
  const params = [];

  if (categoryId) {
    params.push(categoryId);
    where.push(`p.category_id = $${params.length}`);
  }

  if (locationId) {
    params.push(locationId);
    where.push(`sb.location_id = $${params.length}`);
  }

  if (where.length) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  sql += " GROUP BY p.id, c.name ORDER BY p.id DESC";
  const rows = await db.getMany(sql, params);
  res.json(rows);
}));

app.post("/api/products", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(140),
    sku: z.string().trim().min(2).max(80),
    categoryId: z.coerce.number().int().nullable().optional(),
    unitOfMeasure: z.string().trim().min(1).max(40),
    reorderLevel: z.coerce.number().min(0).optional(),
    initialStock: z.coerce.number().min(0).optional(),
    locationId: z.coerce.number().int().positive().optional(),
  });

  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const data = {
    ...parsed.data,
    name: normalizeText(parsed.data.name),
    sku: normalizeText(parsed.data.sku),
    unitOfMeasure: normalizeText(parsed.data.unitOfMeasure),
  };

  if ((data.initialStock || 0) > 0 && !data.locationId) {
    return res.status(400).json({ message: "locationId is required when initialStock is greater than 0" });
  }

  try {
    const createdId = await db.withTransaction(async (client) => {
      const product = await db.getOne(
        `INSERT INTO products(name, sku, category_id, unit_of_measure, reorder_level)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [data.name, data.sku, data.categoryId || null, data.unitOfMeasure, data.reorderLevel || 0],
        client
      );

      if ((data.initialStock || 0) > 0 && data.locationId) {
        const stock = await getOrCreateStock(product.id, data.locationId, client);
        await db.query("UPDATE stock_balances SET qty = qty + $1 WHERE id = $2", [data.initialStock, stock.id], client);
        await writeLedger(product.id, data.locationId, data.initialStock, "Initial stock", "PRODUCT", product.id, client);
      }

      return product.id;
    });

    const row = await db.getOne("SELECT * FROM products WHERE id = $1", [createdId]);
    res.json(row);
    broadcast("product.changed", { action: "created", id: createdId });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: "SKU already exists or invalid data" });
    }
    throw error;
  }
}));

app.put("/api/products/:id", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(140),
    sku: z.string().trim().min(2).max(80),
    categoryId: z.coerce.number().int().nullable().optional(),
    unitOfMeasure: z.string().trim().min(1).max(40),
    reorderLevel: z.coerce.number().min(0),
  });

  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const data = {
    ...parsed.data,
    name: normalizeText(parsed.data.name),
    sku: normalizeText(parsed.data.sku),
    unitOfMeasure: normalizeText(parsed.data.unitOfMeasure),
  };

  try {
    const row = await db.getOne(
      `UPDATE products
       SET name = $1, sku = $2, category_id = $3, unit_of_measure = $4, reorder_level = $5
       WHERE id = $6
       RETURNING *`,
      [data.name, data.sku, data.categoryId || null, data.unitOfMeasure, data.reorderLevel, req.params.id]
    );

    if (!row) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(row);
    broadcast("product.changed", { action: "updated", id: Number(req.params.id) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ message: "Unable to update product" });
    }
    throw error;
  }
}));

app.get("/api/operations", authMiddleware, asyncHandler(async (req, res) => {
  const type = req.query.type;
  const status = req.query.status;
  const limit = Math.min(Number(req.query.limit) || 100, 300);

  let sql = `
    SELECT o.*, sl.name AS source_location_name, dl.name AS destination_location_name
    FROM operations o
    LEFT JOIN locations sl ON sl.id = o.source_location_id
    LEFT JOIN locations dl ON dl.id = o.destination_location_id
  `;

  const where = [];
  const params = [];
  if (type) {
    params.push(type);
    where.push(`o.type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (where.length) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  params.push(limit);
  sql += ` ORDER BY o.id DESC LIMIT $${params.length}`;
  const operations = await db.getMany(sql, params);

  const rows = await Promise.all(
    operations.map(async (operation) => {
      const items = await db.getMany(
        `SELECT oi.*, p.name AS product_name, p.sku
         FROM operation_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.operation_id = $1`,
        [operation.id]
      );
      return { ...operation, items };
    })
  );

  res.json(rows);
}));

app.post("/api/operations", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({
    type: z.enum(["Receipt", "Delivery", "Internal", "Adjustment"]),
    status: z.enum(["Draft", "Waiting", "Ready", "Done", "Canceled"]).optional(),
    supplier: z.string().trim().max(120).optional(),
    customer: z.string().trim().max(120).optional(),
    sourceLocationId: z.coerce.number().int().positive().optional(),
    destinationLocationId: z.coerce.number().int().positive().optional(),
    notes: z.string().trim().max(600).optional(),
    items: z.array(z.object({ productId: z.coerce.number().int(), quantity: z.coerce.number().positive() })).min(1),
  });

  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const data = parsed.data;

  if (data.type === "Receipt" && !data.destinationLocationId) {
    return res.status(400).json({ message: "Receipt requires destinationLocationId" });
  }
  if (data.type === "Delivery" && !data.sourceLocationId) {
    return res.status(400).json({ message: "Delivery requires sourceLocationId" });
  }
  if (data.type === "Internal" && (!data.sourceLocationId || !data.destinationLocationId)) {
    return res.status(400).json({ message: "Internal transfer requires sourceLocationId and destinationLocationId" });
  }
  if (data.type === "Internal" && data.sourceLocationId === data.destinationLocationId) {
    return res.status(400).json({ message: "Source and destination locations must be different for Internal transfer" });
  }
  if (data.type === "Adjustment" && !data.sourceLocationId) {
    return res.status(400).json({ message: "Adjustment requires sourceLocationId" });
  }

  const productIds = [...new Set(data.items.map((item) => item.productId))];
  const existingProducts = await db.getMany("SELECT id FROM products WHERE id = ANY($1::bigint[])", [productIds]);
  if (existingProducts.length !== productIds.length) {
    return res.status(400).json({ message: "One or more products are invalid" });
  }

  const id = await db.withTransaction(async (client) => {
    const operation = await db.getOne(
      `INSERT INTO operations(type, status, supplier, customer, source_location_id, destination_location_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data.type,
        data.status || "Draft",
        data.supplier || null,
        data.customer || null,
        data.sourceLocationId || null,
        data.destinationLocationId || null,
        data.notes || null,
        req.user.id,
      ],
      client
    );

    for (const item of data.items) {
      await db.query(
        "INSERT INTO operation_items(operation_id, product_id, quantity) VALUES ($1, $2, $3)",
        [operation.id, item.productId, item.quantity],
        client
      );
    }

    return operation.id;
  });

  const operation = await db.getOne("SELECT * FROM operations WHERE id = $1", [id]);
  res.json(operation);
  broadcast("operation.changed", { action: "created", id, type: operation.type, status: operation.status });
}));

app.post("/api/operations/:id/validate", authMiddleware, asyncHandler(async (req, res) => {
  const operation = await db.getOne("SELECT * FROM operations WHERE id = $1", [req.params.id]);
  if (!operation) {
    return res.status(404).json({ message: "Operation not found" });
  }
  if (operation.status === "Done") {
    return res.status(400).json({ message: "Already validated" });
  }

  const items = await db.getMany("SELECT * FROM operation_items WHERE operation_id = $1", [operation.id]);
  if (!items.length) {
    return res.status(400).json({ message: "No items on this operation" });
  }

  try {
    await db.withTransaction(async (client) => {
      if (operation.type === "Receipt") {
        if (!operation.destination_location_id) {
          throw new Error("Receipt requires destination location");
        }

        for (const item of items) {
          const stock = await getOrCreateStock(item.product_id, operation.destination_location_id, client);
          await db.query("UPDATE stock_balances SET qty = qty + $1 WHERE id = $2", [item.quantity, stock.id], client);
          await writeLedger(item.product_id, operation.destination_location_id, item.quantity, "Receipt validated", "Receipt", operation.id, client);
        }
      }

      if (operation.type === "Delivery") {
        if (!operation.source_location_id) {
          throw new Error("Delivery requires source location");
        }

        for (const item of items) {
          const stock = await getOrCreateStock(item.product_id, operation.source_location_id, client);
          if (stock.qty < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.product_id}`);
          }

          await db.query("UPDATE stock_balances SET qty = qty - $1 WHERE id = $2", [item.quantity, stock.id], client);
          await writeLedger(item.product_id, operation.source_location_id, -item.quantity, "Delivery validated", "Delivery", operation.id, client);
        }
      }

      if (operation.type === "Internal") {
        if (!operation.source_location_id || !operation.destination_location_id) {
          throw new Error("Internal transfer requires source and destination");
        }

        for (const item of items) {
          const source = await getOrCreateStock(item.product_id, operation.source_location_id, client);
          const destination = await getOrCreateStock(item.product_id, operation.destination_location_id, client);
          if (source.qty < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.product_id}`);
          }

          await db.query("UPDATE stock_balances SET qty = qty - $1 WHERE id = $2", [item.quantity, source.id], client);
          await db.query("UPDATE stock_balances SET qty = qty + $1 WHERE id = $2", [item.quantity, destination.id], client);
          await writeLedger(item.product_id, operation.source_location_id, -item.quantity, "Internal transfer out", "Internal", operation.id, client);
          await writeLedger(item.product_id, operation.destination_location_id, item.quantity, "Internal transfer in", "Internal", operation.id, client);
        }
      }

      if (operation.type === "Adjustment") {
        if (!operation.source_location_id) {
          throw new Error("Adjustment requires location in source location field");
        }

        for (const item of items) {
          const stock = await getOrCreateStock(item.product_id, operation.source_location_id, client);
          const delta = item.quantity - stock.qty;
          await db.query("UPDATE stock_balances SET qty = $1 WHERE id = $2", [item.quantity, stock.id], client);
          await writeLedger(item.product_id, operation.source_location_id, delta, "Stock adjustment", "Adjustment", operation.id, client);
        }
      }

      await db.query("UPDATE operations SET status = 'Done', updated_at = NOW() WHERE id = $1", [operation.id], client);
    });

    broadcast("operation.changed", { action: "validated", id: operation.id, type: operation.type, status: "Done" });
    broadcast("stock.changed", { operationId: operation.id, operationType: operation.type });
    return res.json({ message: "Operation validated" });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Validation failed" });
  }
}));

app.patch("/api/operations/:id/status", authMiddleware, asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(["Draft", "Waiting", "Ready", "Done", "Canceled"]) });
  const parsed = withSchema(schema, req.body);
  if (!parsed.ok) {
    return res.status(400).json(parsed.error);
  }

  const operation = await db.getOne(
    "UPDATE operations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [parsed.data.status, req.params.id]
  );

  if (!operation) {
    return res.status(404).json({ message: "Operation not found" });
  }

  res.json(operation);
  broadcast("operation.changed", { action: "status-updated", id: Number(req.params.id), status: parsed.data.status, type: operation.type });
}));

app.get("/api/ledger", authMiddleware, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 300, 1000);
  const rows = await db.getMany(
    `SELECT l.id, l.created_at, l.change_qty, l.reason, l.reference_type, l.reference_id,
            p.name AS product_name, p.sku,
            loc.name AS location_name, w.name AS warehouse_name
     FROM stock_ledger l
     JOIN products p ON p.id = l.product_id
     JOIN locations loc ON loc.id = l.location_id
     JOIN warehouses w ON w.id = loc.warehouse_id
     ORDER BY l.id DESC
     LIMIT $1`,
    [limit]
  );

  res.json(rows);
}));

app.get("/api/dashboard", authMiddleware, asyncHandler(async (req, res) => {
  const type = req.query.type || null;
  const status = req.query.status || null;
  const warehouseId = req.query.warehouseId || null;
  const categoryId = req.query.categoryId || null;

  const totalInStockRow = await db.getOne(
    `SELECT COALESCE(SUM(sb.qty), 0) AS qty
     FROM stock_balances sb
     JOIN locations loc ON loc.id = sb.location_id
     WHERE ($1::bigint IS NULL OR loc.warehouse_id = $1::bigint)`,
    [warehouseId]
  );

  const lowStockRow = await db.getOne(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT p.id, COALESCE(SUM(sb.qty), 0) AS stock, p.reorder_level
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       LEFT JOIN locations loc ON loc.id = sb.location_id
       WHERE ($1::bigint IS NULL OR loc.warehouse_id = $1::bigint)
         AND ($2::bigint IS NULL OR p.category_id = $2::bigint)
       GROUP BY p.id, p.reorder_level
     ) x
     WHERE x.stock <= x.reorder_level`,
    [warehouseId, categoryId]
  );

  const outOfStockRow = await db.getOne(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT p.id, COALESCE(SUM(sb.qty), 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       LEFT JOIN locations loc ON loc.id = sb.location_id
       WHERE ($1::bigint IS NULL OR loc.warehouse_id = $1::bigint)
         AND ($2::bigint IS NULL OR p.category_id = $2::bigint)
       GROUP BY p.id
     ) x
     WHERE x.stock <= 0`,
    [warehouseId, categoryId]
  );

  const pendingReceiptsRow = await db.getOne(
    "SELECT COUNT(*) AS count FROM operations WHERE type = 'Receipt' AND status != 'Done'"
  );
  const pendingDeliveriesRow = await db.getOne(
    "SELECT COUNT(*) AS count FROM operations WHERE type = 'Delivery' AND status != 'Done'"
  );
  const scheduledTransfersRow = await db.getOne(
    "SELECT COUNT(*) AS count FROM operations WHERE type = 'Internal' AND status IN ('Draft', 'Waiting', 'Ready')"
  );

  let operationsSql = `
    SELECT o.*, sl.name AS source_location_name, dl.name AS destination_location_name
    FROM operations o
    LEFT JOIN locations sl ON sl.id = o.source_location_id
    LEFT JOIN locations dl ON dl.id = o.destination_location_id
    WHERE 1 = 1
  `;

  const params = [];
  if (type) {
    params.push(type);
    operationsSql += ` AND o.type = $${params.length}`;
  }
  if (status) {
    params.push(status);
    operationsSql += ` AND o.status = $${params.length}`;
  }
  if (warehouseId) {
    params.push(warehouseId);
    operationsSql += ` AND ((sl.id IS NOT NULL AND sl.warehouse_id = $${params.length}) OR (dl.id IS NOT NULL AND dl.warehouse_id = $${params.length}))`;
  }
  if (categoryId) {
    params.push(categoryId);
    operationsSql += ` AND EXISTS (
      SELECT 1
      FROM operation_items oi
      JOIN products pp ON pp.id = oi.product_id
      WHERE oi.operation_id = o.id AND pp.category_id = $${params.length}
    )`;
  }

  operationsSql += " ORDER BY o.id DESC LIMIT 20";
  const operations = await db.getMany(operationsSql, params);

  return res.json({
    kpis: {
      totalInStock: totalInStockRow?.qty || 0,
      lowStockCount: lowStockRow?.count || 0,
      outOfStockCount: outOfStockRow?.count || 0,
      pendingReceipts: pendingReceiptsRow?.count || 0,
      pendingDeliveries: pendingDeliveriesRow?.count || 0,
      scheduledTransfers: scheduledTransfersRow?.count || 0,
    },
    operations,
  });
}));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

async function start() {
  await db.initDatabase();
  app.listen(PORT, () => {
    console.log(`Inventory backend running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
