CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'manager',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, name)
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  category_id BIGINT REFERENCES categories(id),
  unit_of_measure VARCHAR(40) NOT NULL,
  reorder_level NUMERIC(18, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_balances (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  location_id BIGINT NOT NULL REFERENCES locations(id),
  qty NUMERIC(18, 4) NOT NULL DEFAULT 0,
  UNIQUE(product_id, location_id)
);

CREATE TABLE IF NOT EXISTS operations (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  supplier VARCHAR(120),
  customer VARCHAR(120),
  source_location_id BIGINT REFERENCES locations(id),
  destination_location_id BIGINT REFERENCES locations(id),
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operation_items (
  id BIGSERIAL PRIMARY KEY,
  operation_id BIGINT NOT NULL REFERENCES operations(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity NUMERIC(18, 4) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  location_id BIGINT NOT NULL REFERENCES locations(id),
  change_qty NUMERIC(18, 4) NOT NULL,
  reason VARCHAR(180) NOT NULL,
  reference_type VARCHAR(60) NOT NULL,
  reference_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_otps_user_code_used ON otps(user_id, code, used);
CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_stock_balances_product_location ON stock_balances(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_operation_items_operation_id ON operation_items(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_items_product_id ON operation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);
CREATE INDEX IF NOT EXISTS idx_operations_created_by ON operations(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON stock_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_location ON stock_ledger(product_id, location_id);

INSERT INTO warehouses(name) VALUES ('Main Warehouse') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories(name) VALUES ('General') ON CONFLICT (name) DO NOTHING;

INSERT INTO locations(warehouse_id, name)
SELECT id, 'Default Bin' FROM warehouses WHERE name = 'Main Warehouse'
ON CONFLICT (warehouse_id, name) DO NOTHING;
