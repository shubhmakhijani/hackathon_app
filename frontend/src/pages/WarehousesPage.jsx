import { useEffect, useState } from "react";
import api from "../api";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouseName, setWarehouseName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const load = async () => {
    const [{ data: w }, { data: l }] = await Promise.all([api.get("/warehouses"), api.get("/locations")]);
    setWarehouses(w);
    setLocations(l);
    if (!warehouseId && w[0]) {
      setWarehouseId(String(w[0].id));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addWarehouse = async (e) => {
    e.preventDefault();
    if (!warehouseName) return;
    await api.post("/warehouses", { name: warehouseName });
    setWarehouseName("");
    await load();
  };

  const addLocation = async (e) => {
    e.preventDefault();
    if (!locationName || !warehouseId) return;
    await api.post("/locations", { name: locationName, warehouseId: Number(warehouseId) });
    setLocationName("");
    await load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouse Settings</h1>
          <p className="page-subtitle">Manage warehouses and internal storage locations.</p>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: "1rem" }}>Add Warehouse</h3>
          <form onSubmit={addWarehouse} className="col gap-3">
            <div className="form-field">
              <label className="form-label">Warehouse Name <span className="req">*</span></label>
              <input placeholder="e.g. Main Warehouse" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} required />
            </div>
            <button className="btn btn-primary">Create Warehouse</button>
          </form>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: "1rem" }}>Add Location</h3>
          <form onSubmit={addLocation} className="col gap-3">
            <div className="form-field">
              <label className="form-label">Warehouse <span className="req">*</span></label>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
                <option value="">— Select —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Location Name <span className="req">*</span></label>
              <input placeholder="e.g. Rack A" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
            </div>
            <button className="btn btn-primary">Create Location</button>
          </form>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Warehouses</span>
          <span className="text-muted text-sm">{warehouses.length} warehouses</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Locations</th></tr></thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id}>
                  <td className="text-muted text-sm">{w.id}</td>
                  <td className="fw-600">{w.name}</td>
                  <td>{w.location_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Locations</span>
          <span className="text-muted text-sm">{locations.length} locations</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Warehouse</th><th>Location Name</th></tr></thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id}>
                  <td className="text-muted text-sm">{l.id}</td>
                  <td>{l.warehouse_name}</td>
                  <td>{l.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
