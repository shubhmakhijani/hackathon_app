import { useEffect, useState } from "react";
import api from "../api";
import Drawer from "../components/Drawer";

const initialForm = {
  name: "",
  sku: "",
  categoryId: "",
  unitOfMeasure: "pcs",
  reorderLevel: 0,
  initialStock: 0,
  locationId: "",
};

function stockBadge(total, reorder) {
  if (total <= 0) return <span className="badge badge-zero">Out of Stock</span>;
  if (total <= reorder) return <span className="badge badge-low">Low Stock</span>;
  return <span className="badge badge-ok">In Stock</span>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: c }, { data: l }] = await Promise.all([
      api.get("/products"),
      api.get("/categories"),
      api.get("/locations"),
    ]);
    setProducts(p);
    setCategories(c);
    setLocations(l);
  };

  useEffect(() => {
    load();
  }, []);

  const openDrawer = () => {
    setForm(initialForm);
    setError("");
    setDrawerOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/products", {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        locationId: form.locationId ? Number(form.locationId) : undefined,
        reorderLevel: Number(form.reorderLevel),
        initialStock: Number(form.initialStock),
      });
      setDrawerOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create product");
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage product catalogue, SKUs, and stock levels.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openDrawer}>
            + Add Product
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">Find</span>
          <input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Product Catalogue</span>
          <span className="text-muted text-sm">{filtered.length} items</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Total Stock</th>
                <th>Reorder At</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-600">{p.name}</td>
                    <td className="text-muted text-sm">{p.sku}</td>
                    <td>{p.category_name || <span className="text-subtle">-</span>}</td>
                    <td>{p.unit_of_measure}</td>
                    <td>{p.total_stock}</td>
                    <td>{p.reorder_level}</td>
                    <td>{stockBadge(p.total_stock, p.reorder_level)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-icon">INV</div>
                      No products found
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Product"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" form="product-form" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Product"}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="form-section">
          {error && <div className="msg-error">{error}</div>}

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">
                Product Name <span className="req">*</span>
              </label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-field">
              <label className="form-label">
                SKU / Code <span className="req">*</span>
              </label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">- None -</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">
                Unit of Measure <span className="req">*</span>
              </label>
              <input value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} required />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Reorder Level</label>
            <input type="number" min="0" step="0.01" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            <span className="form-hint">Alert will show when stock falls at or below this value</span>
          </div>

          <div className="divider" />
          <span className="form-section-title">Initial Stock (optional)</span>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">Quantity</label>
              <input type="number" min="0" step="0.01" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
            </div>
            <div className="form-field">
              <label className="form-label">Location</label>
              <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">- Select location -</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.warehouse_name} / {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Drawer>
    </>
  );
}
