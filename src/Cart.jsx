import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";

export default function Cart() {
  const { user, ready: authReady } = useAuth();
  const { cart, loading: cartLoading, error: cartError, clearError, setQuantity, removeFromCart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState(user?.default_address || "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError("");
    if (address.trim().length < 10) return setError("Укажите адрес доставки (от 10 символов)");
    if (!date) return setError("Укажите дату доставки");

    setSending(true);
    try {
      await api.createOrder({ address, delivery_date: date });
      await refreshCart();
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <h2>Корзина</h2>
      {cartError && <div className="error-message">{cartError}</div>}
      {!authReady || cartLoading ? (
        <div className="state-message">Загрузка корзины...</div>
      ) : cart.items.length === 0 ? (
        <p>Ваша корзина пуста. <Link to="/">Перейти к покупкам</Link></p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Цена</th>
                <th>Количество</th>
                <th>Сумма</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.product_id}>
                  <td><b>{item.name}</b></td>
                  <td>{item.final_price} ₽</td>
                  <td>
                    <div className="row">
                      <button disabled={item.quantity <= 1} onClick={() => { clearError(); void setQuantity(item.product_id, item.quantity - 1); }}>-</button>
                      <span>{item.quantity}</span>
                      <button disabled={item.quantity >= 10} onClick={() => { clearError(); void setQuantity(item.product_id, item.quantity + 1); }}>+</button>
                    </div>
                  </td>
                  <td>{(item.final_price * item.quantity).toFixed(2)} ₽</td>
                  <td>
                    <button className="btn-danger" onClick={() => { clearError(); void removeFromCart(item.product_id); }}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="summary">
            <div>Сумма товаров: {cart.subtotal} ₽</div>
            {cart.discount_percent > 0 && (
              <div className="success">
                {cart.discount_label}: -{cart.discount_percent}% (-{cart.discount_amount} ₽)
              </div>
            )}
            <div className="total">Итого: {cart.total} ₽</div>
          </div>

          <h3>Оформление заказа</h3>
          <form className="form" onSubmit={handleCheckout} noValidate>
            <label>
              Адрес доставки:
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </label>
            <label>
              Дата доставки:
              <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" disabled={sending}>
              {sending ? "Оформляем..." : "Подтвердить заказ"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}