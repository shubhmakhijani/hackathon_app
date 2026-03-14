import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const requestOtp = async () => {
    const { data } = await api.post("/auth/request-reset", { email });
    setMessage(data.message);
    setDemoOtp(data.otpDemo || "");
  };

  const reset = async () => {
    const { data } = await api.post("/auth/reset-password", { email, otp, newPassword });
    setMessage(data.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-brand-name">CoreInventory</div>
          <div className="auth-brand-sub">Inventory Management System</div>
        </div>
        <h2 className="auth-heading">Reset Password</h2>
        <p className="auth-footer">Enter your email to receive a one-time code.</p>
        {message && <div className="msg-success">{message}</div>}
        {demoOtp && <div className="msg-warning">Demo OTP: {demoOtp}</div>}
        <div className="form-field">
          <label className="form-label">Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={requestOtp}>Send OTP</button>
        <hr className="auth-divider" />
        <div className="form-field">
          <label className="form-label">6-digit OTP</label>
          <input placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">New Password</label>
          <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={reset}>Reset Password</button>
        <hr className="auth-divider" />
        <p className="auth-footer">Remembered it? <Link to="/login">Back to Sign in</Link></p>
      </div>
    </div>
  );
}
