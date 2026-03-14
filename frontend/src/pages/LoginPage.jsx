import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manager");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password, role });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-logo">
          <div className="auth-brand-name">CoreInventory</div>
          <div className="auth-brand-sub">Inventory Management System</div>
        </div>
        <h2 className="auth-heading">Sign in to your account</h2>
        {error && <div className="msg-error">{error}</div>}
        <div className="form-field">
          <label className="form-label">Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="form-field">
          <label className="form-label">Login As</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="manager">Inventory Manager</option>
            <option value="staff">Warehouse Staff</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Sign in</button>
        <hr className="auth-divider" />
        <p className="auth-footer"><Link to="/reset">Forgot password?</Link></p>
        <p className="auth-footer">No account? <Link to="/signup">Sign up</Link></p>
      </form>
    </div>
  );
}
