import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/signup", form);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <div className="auth-brand-name">CoreInventory</div>
          <div className="auth-brand-sub">Inventory Management System</div>
        </div>
        <h2 className="auth-heading">Create your account</h2>
        {error && <div className="msg-error">{error}</div>}
        <div className="form-field">
          <label className="form-label">Full Name</label>
          <input placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-field">
          <label className="form-label">Email</label>
          <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Create Account</button>
        <hr className="auth-divider" />
        <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
