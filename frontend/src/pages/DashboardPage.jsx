import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { StatusBadge, TypeBadge } from "../components/StatusBadge";

const KPI_META = [
  { key: "totalInStock", label: "Total In Stock", icon: "INV" },
  { key: "lowStockCount", label: "Low Stock Items", icon: "LOW" },
  { key: "outOfStockCount", label: "Out of Stock", icon: "OOS" },
  { key: "pendingReceipts", label: "Pending Receipts", icon: "RCV" },
  { key: "pendingDeliveries", label: "Pending Deliveries", icon: "DLV" },
  { key: "scheduledTransfers", label: "Scheduled Transfers", icon: "TRF" },
];

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ type: "", status: "", warehouseId: "", categoryId: "" });
  const [liveConnected, setLiveConnected] = useState(false);

  const load = async (f = filters) => {
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
    const [{ data: d }, { data: ws }, { data: cs }] = await Promise.all([
      api.get("/dashboard", { params }),
      api.get("/warehouses"),
      api.get("/categories"),
    ]);
    setDashboard(d);
    setWarehouses(ws);
    setCategories(cs);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ims_token");
    if (!token) return;

    const streamUrl = `${api.defaults.baseURL}/stream?token=${encodeURIComponent(token)}`;
    const stream = new EventSource(streamUrl);

    stream.addEventListener("connected", () => setLiveConnected(true));
    stream.addEventListener("heartbeat", () => setLiveConnected(true));

    const refreshEvents = ["stock.changed", "operation.changed", "product.changed", "location.changed", "warehouse.changed", "category.changed"];
    const handlers = refreshEvents.map((evt) => {
      const fn = () => load();
      stream.addEventListener(evt, fn);
      return { evt, fn };
    });

    stream.onerror = () => setLiveConnected(false);

    return () => {
      handlers.forEach(({ evt, fn }) => stream.removeEventListener(evt, fn));
      stream.close();
    };
  }, []);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  };

  const kpis = useMemo(() => {
    if (!dashboard) return [];
    return KPI_META.map((m) => ({ ...m, value: dashboard.kpis[m.key] ?? 0 }));
  }, [dashboard]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Dashboard</h1>
          <p className="page-subtitle">Real-time snapshot of stock health and pending operations.</p>
        </div>
        <div>
          <span className={`badge ${liveConnected ? "badge-Done" : "badge-Waiting"}`}>
            {liveConnected ? "Live: Connected" : "Live: Reconnecting"}
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.key}>
            <div className="kpi-icon kpi-text-icon">{k.icon}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
          <option value="">All Types</option>
          <option value="Receipt">Receipt</option>
          <option value="Delivery">Delivery</option>
          <option value="Internal">Internal</option>
          <option value="Adjustment">Adjustment</option>
        </select>
        <select className="filter-select" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="">All Statuses</option>
          {["Draft", "Waiting", "Ready", "Done", "Canceled"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="filter-select" value={filters.warehouseId} onChange={(e) => updateFilter("warehouseId", e.target.value)}>
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select className="filter-select" value={filters.categoryId} onChange={(e) => updateFilter("categoryId", e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Recent Operations</span>
          <span className="text-muted text-sm">{dashboard?.operations?.length ?? 0} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Status</th>
                <th>From</th>
                <th>To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.operations?.length ? (
                dashboard.operations.map((op) => (
                  <tr key={op.id}>
                    <td className="text-muted text-sm">{op.id}</td>
                    <td>
                      <TypeBadge type={op.type} />
                    </td>
                    <td>
                      <StatusBadge status={op.status} />
                    </td>
                    <td>{op.source_location_name || <span className="text-subtle">-</span>}</td>
                    <td>{op.destination_location_name || <span className="text-subtle">-</span>}</td>
                    <td className="text-muted text-sm">{new Date(op.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
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
    </>
  );
}
