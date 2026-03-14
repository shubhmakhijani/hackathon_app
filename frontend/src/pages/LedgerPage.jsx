import { useEffect, useState } from "react";
import api from "../api";

export default function LedgerPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/ledger").then((res) => setRows(res.data));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Move History</h1>
          <p className="page-subtitle">Every stock movement and adjustment is logged here.</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">Stock Ledger</span>
          <span className="text-muted text-sm">{rows.length} entries</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Warehouse</th>
                <th>Location</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-sm text-muted">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="fw-600">{row.product_name}</td>
                  <td className="text-sm text-muted">{row.sku}</td>
                  <td>{row.warehouse_name}</td>
                  <td>{row.location_name}</td>
                  <td>
                    <span style={{ color: row.change_qty >= 0 ? "#166534" : "#b91c1c", fontWeight: 600 }}>
                      {row.change_qty >= 0 ? "+" : ""}{row.change_qty}
                    </span>
                  </td>
                  <td className="text-sm">{row.reason}</td>
                  <td className="text-sm text-muted">{row.reference_type} #{row.reference_id}</td>
                </tr>
              )) : (
                <tr><td colSpan={8}>
                  <div className="empty-state"><div className="empty-icon">📜</div>No ledger entries yet</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
