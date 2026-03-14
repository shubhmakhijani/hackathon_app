import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import Drawer from "../components/Drawer";
import { StatusBadge, TypeBadge } from "../components/StatusBadge";

const TYPES = ["Receipt", "Delivery", "Internal", "Adjustment"];
const STATUSES = ["Draft", "Waiting", "Ready", "Done", "Canceled"];

const emptyForm = {
  type: "Receipt",
  status: "Draft",
  supplier: "",
  customer: "",
  sourceLocationId: "",
  destinationLocationId: "",
  notes: "",
  items: [{ productId: "", quantity: 1 }],
};

function typeLabel(t) {
  const map = {
    Receipt: "Receipt",
    Delivery: "Delivery",
    Internal: "Transfer",
    Adjustment: "Adjustment",
  };
  return map[t] || t;
}

export default function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "";
  const activeStatus = searchParams.get("status") || "";

  const [operations, setOperations] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, type: activeType || "Receipt" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (typ = activeType, stat = activeStatus) => {
    const params = {};
    if (typ) params.type = typ;
    if (stat) params.status = stat;

    const [{ data: ops }, { data: p }, { data: l }] = await Promise.all([
      api.get("/operations", { params }),
      api.get("/products"),
      api.get("/locations"),
    ]);

    setOperations(ops);
    setProducts(p);
    setLocations(l);
  };

  useEffect(() => {
    load(activeType, activeStatus);
  }, [activeType, activeStatus]);

  const setType = (t) => {
    const p = new URLSearchParams(searchParams);
    if (t) p.set("type", t);
    else p.delete("type");
    p.delete("status");
    setSearchParams(p);
  };

  const setStatus = (s) => {
    const p = new URLSearchParams(searchParams);
    if (s) p.set("status", s);
    else p.delete("status");
    setSearchParams(p);
  };

  const setItem = (i, key, val) => {
    const next = [...form.items];
    next[i] = { ...next[i], [key]: val };
    setForm({ ...form, items: next });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: "", quantity: 1 }] });

  const removeItem = (i) => {
    const next = form.items.filter((_, idx) => idx !== i);
    setForm({ ...form, items: next.length ? next : [{ productId: "", quantity: 1 }] });
  };

  const openDrawer = () => {
    setForm({ ...emptyForm, type: activeType || "Receipt" });
    setError("");
    setDrawerOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/operations", {
        ...form,
        sourceLocationId: form.sourceLocationId ? Number(form.sourceLocationId) : undefined,
        destinationLocationId: form.destinationLocationId ? Number(form.destinationLocationId) : undefined,
        items: form.items.map((it) => ({ productId: Number(it.productId), quantity: Number(it.quantity) })),
      });
      setDrawerOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create operation");
    } finally {
      setSaving(false);
    }
  };

  const validate = async (id) => {
    try {
      await api.post(`/operations/${id}/validate`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Validation failed");
    }
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/operations/${id}/status`, { status });
    await load();
  };

  const pageTitle = activeType ? `${typeLabel(activeType)}s` : "All Operations";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">Manage incoming, outgoing, transfers and adjustments.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openDrawer}>
            + New {activeType || "Operation"}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="tab-group">
          <button className={`tab-btn ${activeType === "" ? "active" : ""}`} onClick={() => setType("")}>
            All
          </button>
          {TYPES.map((t) => (
            <button key={t} className={`tab-btn ${activeType === t ? "active" : ""}`} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="status-chips">
          <button className={`chip ${activeStatus === "" ? "active" : ""}`} onClick={() => setStatus("")}>
            All
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={`chip ${activeStatus === s ? "active" : ""}`} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">{pageTitle}</span>
          <span className="text-muted text-sm">{operations.length} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Status</th>
                <th>Supplier / Customer</th>
                <th>From</th>
                <th>To</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {operations.length ? (
                operations.map((op) => (
                  <tr key={op.id}>
                    <td className="text-muted text-sm">{op.id}</td>
                    <td>
                      <TypeBadge type={op.type} />
                    </td>
                    <td>
                      <StatusBadge status={op.status} />
                    </td>
                    <td>{op.supplier || op.customer || <span className="text-subtle">-</span>}</td>
                    <td className="text-sm">{op.source_location_name || <span className="text-subtle">-</span>}</td>
                    <td className="text-sm">{op.destination_location_name || <span className="text-subtle">-</span>}</td>
                    <td className="text-sm">
                      {op.items.length} item{op.items.length !== 1 ? "s" : ""}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {op.status !== "Done" && op.status !== "Canceled" && (
                          <button className="btn btn-sm btn-primary" onClick={() => validate(op.id)}>
                            Validate
                          </button>
                        )}
                        {op.status !== "Done" && op.status !== "Canceled" && (
                          <select
                            className="filter-select btn-sm"
                            style={{ minWidth: 100, padding: "4px 8px" }}
                            value={op.status}
                            onChange={(e) => changeStatus(op.id, e.target.value)}
                          >
                            {["Draft", "Waiting", "Ready", "Canceled", "Done"].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">OPS</div>
                      No operations found
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
        title={`New ${form.type}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" form="op-form" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </button>
          </>
        }
      >
        <form id="op-form" onSubmit={submit} className="form-section">
          {error && <div className="msg-error">{error}</div>}

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">
                Operation Type <span className="req">*</span>
              </label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Receipt">Receipt (Incoming)</option>
                <option value="Delivery">Delivery (Outgoing)</option>
                <option value="Internal">Internal Transfer</option>
                <option value="Adjustment">Inventory Adjustment</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Draft</option>
                <option>Waiting</option>
                <option>Ready</option>
              </select>
            </div>
          </div>

          {form.type === "Receipt" && (
            <div className="form-field">
              <label className="form-label">Supplier</label>
              <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
            </div>
          )}
          {form.type === "Delivery" && (
            <div className="form-field">
              <label className="form-label">Customer</label>
              <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" />
            </div>
          )}

          <div className="form-grid-2">
            {(form.type === "Internal" || form.type === "Delivery" || form.type === "Adjustment") && (
              <div className="form-field">
                <label className="form-label">{form.type === "Adjustment" ? "Location (Counted)" : "Source Location"}</label>
                <select value={form.sourceLocationId} onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value })}>
                  <option value="">- Select -</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.warehouse_name} / {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(form.type === "Internal" || form.type === "Receipt") && (
              <div className="form-field">
                <label className="form-label">Destination Location</label>
                <select value={form.destinationLocationId} onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}>
                  <option value="">- Select -</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.warehouse_name} / {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <div className="divider" />
          <span className="form-section-title">Products / Items</span>

          <table className="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ width: 90 }}>Qty</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <select value={item.productId} onChange={(e) => setItem(idx, "productId", e.target.value)} required>
                      <option value="">- Product -</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} required />
                  </td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => removeItem(idx)} title="Remove row">
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={addItem}>
            + Add Row
          </button>
        </form>
      </Drawer>
    </>
  );
}
