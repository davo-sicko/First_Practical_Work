import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Cabinet({ user, onUpdateUser, onLogout }) {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    default_address: user?.default_address || "",
  });

  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState({ error: "", success: "" });

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token && !user) {
      navigate("/login");
      return;
    }
    fetchOrders();
  }, [token, user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/orders/my", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMsg({ error: "", success: "" });
    try {
      const res = await fetch("http://localhost:3001/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (onUpdateUser) onUpdateUser(data);
      setMsg({ success: "Данные профиля обновлены!", error: "" });
    } catch (err) {
      setMsg({ error: err.message, success: "" });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMsg({ error: "", success: "" });
    try {
      const res = await fetch("http://localhost:3001/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwords),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPasswords({ current_password: "", new_password: "" });
      setMsg({ success: "Пароль успешно изменён!", error: "" });
    } catch (err) {
      setMsg({ error: err.message, success: "" });
    }
  };

  const handlePayOrder = async (orderId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExit = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: 860, margin: "20px auto", padding: 24, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2>Личный кабинет ({user?.role === "admin" ? "Администратор" : "Покупатель"})</h2>
        <button onClick={handleExit} style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Выйти из аккаунта
        </button>
      </div>

      {msg.error && <div style={{ padding: 10, background: "#451a1a", color: "#fca5a5", borderRadius: 6, marginBottom: 12 }}>{msg.error}</div>}
      {msg.success && <div style={{ padding: 10, background: "#14532d", color: "#86efac", borderRadius: 6, marginBottom: 12 }}>{msg.success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
        <form onSubmit={handleSaveProfile} style={{ background: "#1a1a1a", padding: 20, borderRadius: 8 }}>
          <h3 style={{ marginBottom: 14 }}>Данные пользователя</h3>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>ФИО</label>
            <input
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>Email</label>
            <input
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>Телефон</label>
            <input
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>Адрес по умолчанию</label>
            <input
              value={profile.default_address || ""}
              onChange={(e) => setProfile({ ...profile, default_address: e.target.value })}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
            />
          </div>
          <button type="submit" style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Сохранить профиль
          </button>
        </form>

        <form onSubmit={handleChangePassword} style={{ background: "#1a1a1a", padding: 20, borderRadius: 8 }}>
          <h3 style={{ marginBottom: 14 }}>Изменение пароля</h3>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>Текущий пароль</label>
            <input
              type="password"
              required
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>Новый пароль (от 6 симв.)</label>
            <input
              type="password"
              required
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #333", borderRadius: 4 }}
            />
          </div>
          <button type="submit" style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Обновить пароль
          </button>
        </form>
      </div>

      <h3>Мои заказы</h3>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.length === 0 ? (
          <p style={{ color: "#aaa" }}>Заказов пока нет</p>
        ) : (
          orders.map((o) => (
            <div key={o.order_id} style={{ background: "#1a1a1a", padding: 16, borderRadius: 8, border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Заказ #{o.order_id} от {new Date(o.created_at).toLocaleDateString()}</strong>
                <span style={{ color: o.status === "Оплачен" ? "#22c55e" : "#eab308" }}>{o.status}</span>
              </div>
              <div style={{ fontSize: 14, color: "#aaa", marginBottom: 6 }}>Адрес: {o.address} | Доставка: {o.delivery_date}</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Итого: <strong>{o.total} ₽</strong></div>
              {o.status === "Ожидает оплаты" && (
                <button
                  onClick={() => handlePayOrder(o.order_id)}
                  style={{ padding: "6px 14px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                >
                  Оплатить
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}