import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

function initials(name) {
  if (!name) return "U";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function SidebarLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="mobile-nav">
        <Link className="mobile-brand" to="/dashboard">CoreInventory</Link>
        <nav className="mobile-links">
          <NavLink to="/dashboard" className={({ isActive }) => `mobile-link ${isActive ? "active" : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `mobile-link ${isActive ? "active" : ""}`}>
            Products
          </NavLink>
          <NavLink to="/operations" className={({ isActive }) => `mobile-link ${isActive ? "active" : ""}`}>
            Operations
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `mobile-link ${isActive ? "active" : ""}`}>
            Ledger
          </NavLink>
        </nav>
      </header>

      <aside className="sidebar">
        <Link className="brand" to="/dashboard">
          <span className="brand-name">CoreInventory</span>
          <span className="brand-sub">Inventory Management</span>
        </Link>

        <nav>
          <div className="nav-section">
            <span className="nav-label">Main</span>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">DB</span> Dashboard
            </NavLink>
            <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">PR</span> Products
            </NavLink>
          </div>

          <div className="nav-section">
            <span className="nav-label">Operations</span>
            <NavLink to="/operations?type=Receipt" className={({ isActive }) => `nav-item nav-sub ${isActive ? "active" : ""}`}>
              Receipts
            </NavLink>
            <NavLink to="/operations?type=Delivery" className={({ isActive }) => `nav-item nav-sub ${isActive ? "active" : ""}`}>
              Deliveries
            </NavLink>
            <NavLink to="/operations?type=Internal" className={({ isActive }) => `nav-item nav-sub ${isActive ? "active" : ""}`}>
              Transfers
            </NavLink>
            <NavLink to="/operations?type=Adjustment" className={({ isActive }) => `nav-item nav-sub ${isActive ? "active" : ""}`}>
              Adjustments
            </NavLink>
            <NavLink to="/ledger" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">LG</span> Move History
            </NavLink>
          </div>

          <div className="nav-section">
            <span className="nav-label">Settings</span>
            <NavLink to="/warehouses" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">WH</span> Warehouse
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(user?.name)}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || "User"}</span>
              <span className="sidebar-user-email">{user?.email || ""}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
