import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./AuthContext";

export default function Dashboard() {
  const { user, logout, ready } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setOrdersError("");
    try {
      setOrders(await api.getMyOrders());
    } catch (err) {
      setOrdersError(err.message || "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (user?.role === "user") {
      void loadOrders();
    } else {
      setLoading(false);
    }
  }, [user, ready, loadOrders]);

  if (!ready) {
    return <div className="page"><div className="state-message">Проверка авторизации...</div></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handlePay = async (id) => {
    try {
      await api.payOrder(id);
      loadOrders();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="page">
      <h2>Личный кабинет</h2>
      <div className="order" style={{ marginBottom: 24 }}>
        <p>Пользователь: <b>{user.full_name}</b></p>
        <p>Email: <b>{user.email}</b></p>
        <p>Роль: <b>{user.role}</b></p>
        {user.discount_percent > 0 && (
          <p className="success">Ваша скидка: {user.discount_coupon} ({user.discount_percent}%)</p>
        )}
        <button onClick={handleLogout} style={{ marginTop: 10 }}>Выйти из аккаунта</button>
      </div>

      {user.role === "user" && (
        <>
          <h3>История заказов</h3>
          {loading ? (
            <div className="state-message">Загрузка заказов...</div>
          ) : ordersError ? (
            <div className="error-message">{ordersError}</div>
          ) : orders.length === 0 ? (
            <p className="muted">У вас ещё нет оформленных заказов.</p>
          ) : (
            orders.map((o) => (
              <div className="order" key={o.order_id}>
                <div className="order-head">
                  <strong>Заказ №{o.order_id}</strong>
                  <span className="badge">{o.status}</span>
                </div>
                <div className="muted">Доставка: {o.delivery_date}, {o.address}</div>
                <ul>
                  {o.items.map((it, idx) => (
                    <li key={idx}>{it.name} — {it.quantity} шт. × {it.unit_price} ₽</li>
                  ))}
                </ul>
                <div className="total">Итого к оплате: {o.total} ₽</div>
                {o.status === "Ожидает оплаты" && (
                  <button onClick={() => handlePay(o.order_id)} style={{ marginTop: 8 }}>
                    Оплатить заказ
                  </button>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}