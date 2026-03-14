import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/profile").then((res) => setProfile(res.data));
  }, []);

  const name = profile?.name || user?.name || "User";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your account information.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--brand)", color: "#fff",
            display: "grid", placeItems: "center",
            fontSize: "1.3rem", fontWeight: 700, flexShrink: 0
          }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{name}</div>
            <div className="text-muted text-sm">{profile?.email || user?.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span className="text-muted" style={{ minWidth: 80 }}>Role</span>
            <span className="fw-600">{profile?.role || user?.role || "user"}</span>
          </div>
          {profile?.created_at && (
            <div style={{ display: "flex", gap: 12 }}>
              <span className="text-muted" style={{ minWidth: 80 }}>Joined</span>
              <span>{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
