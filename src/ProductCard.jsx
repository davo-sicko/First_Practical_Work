import { useState } from "react";
import { useCart } from "./CartContext";
import { getToken } from "./api/client";
import { useAuth } from "./AuthContext";

export function ProductCard(props) {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [revError, setRevError] = useState("");
  const [revLoading, setRevLoading] = useState(false);
  const [cartError, setCartError] = useState("");

  const item = props.product || props.item || props.data || props;
  const productId = item.product_id || item.id || props.product_id || props.id;
  const name = item.name || props.name || "";
  const price = item.final_price || item.price || props.price || 0;
  const img = item.image_url || item.img || props.img || props.image_url || "";
  const hasDiscount = item.has_discount ?? props.has_discount;
  const discountPercent = item.discount_percent ?? props.discount_percent;

  const token = getToken();
  const isAdmin = user?.role === "admin";

  const handleAddToCart = async () => {
    setCartError("");
    try {
      await addToCart(productId);
      props.onAdded?.({ name });
    } catch (err) {
      setCartError(err.message || "Не удалось добавить товар в корзину");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить товар "${name}"?`)) return;

    try {
      const res = await fetch(`http://localhost:3001/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Ошибка удаления");
      }

      if (props.onDeleted) {
        props.onDeleted(productId);
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/products/${productId}/reviews`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data);
        setRevError("");
      } else {
        setRevError(data.message || "Не удалось загрузить отзывы");
      }
    } catch (e) {
      setRevError(e.message || "Сервер временно недоступен");
    }
  };

  const handleOpenReviews = () => {
    if (props.onOpenReviews) {
      props.onOpenReviews(item);
    } else {
      fetchReviews();
      setShowReviews(true);
    }
  };

  const handleSendReview = async (e) => {
    e.preventDefault();
    if (!token) {
      setRevError("Войдите в аккаунт, чтобы оставить отзыв");
      return;
    }
    setRevLoading(true);
    setRevError("");
    try {
      const res = await fetch(`http://localhost:3001/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setComment("");
      fetchReviews();
    } catch (err) {
      setRevError(err.message);
    } finally {
      setRevLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Удалить отзыв за нарушение политики?")) return;
    setRevError("");
    try {
      const res = await fetch(`http://localhost:3001/api/products/${productId}/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Не удалось удалить отзыв");
      await fetchReviews();
    } catch (err) {
      setRevError(err.message || "Не удалось удалить отзыв");
    }
  };

  return (
    <div className="product-card" style={{
      border: "1px solid #333",
      borderRadius: 8,
      padding: 16,
      background: "#1c1c1c",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative"
    }}>
      {hasDiscount && (
        <span style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "#dc2626",
          color: "#fff",
          fontSize: 12,
          padding: "2px 8px",
          borderRadius: 4,
          fontWeight: "bold",
          zIndex: 2
        }}>
          -{discountPercent}%
        </span>
      )}

      <div>
        <div className="product-card-image" style={{ width: "100%", height: 250, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 6, background: "#262626" }}>
          {img ? (
            <img
              src={img}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#777" }}>Нет фото</span>
          )}
        </div>

        <h3 className="product-card-title" style={{ margin: "12px 0 6px 0", fontSize: 16 }}>{name}</h3>
        <p className="product-card-price" style={{ fontWeight: "bold", fontSize: 18, margin: "6px 0", color: "#22c55e" }}>
          {price} ₽
        </p>
      </div>

      <div className="product-card-actions" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <button
          onClick={handleAddToCart}
          style={{
            padding: "8px 12px",
            background: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          В корзину
        </button>
        {cartError && <div className="error-message">{cartError}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleOpenReviews}
            style={{
              flex: 1,
              padding: "6px 10px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Отзывы
          </button>

          {isAdmin && (
            <button
              onClick={handleDelete}
              style={{
                padding: "6px 10px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      {showReviews && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#1c1c1c",
            padding: 24,
            borderRadius: 8,
            width: 480,
            maxHeight: "80vh",
            overflowY: "auto",
            border: "1px solid #444",
            color: "#fff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Отзывы: {name}</h3>
              <button
                onClick={() => setShowReviews(false)}
                style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {reviews.length === 0 ? (
                <p style={{ color: "#888" }}>Отзывов пока нет</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.review_id} style={{ background: "#262626", padding: 10, borderRadius: 6 }}>
                    {r.removed_by_admin ? (
                      <div style={{ fontSize: 14 }}>{r.comment}</div>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <strong>{r.author_name}</strong>
                          <span style={{ color: "#eab308" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                        </div>
                        <div style={{ fontSize: 14 }}>{r.comment}</div>
                        {isAdmin && (
                          <button className="btn-danger" style={{ marginTop: 8 }} onClick={() => handleDeleteReview(r.review_id)}>
                            Удалить отзыв
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendReview} style={{ borderTop: "1px solid #333", paddingTop: 14 }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Оставить отзыв</h4>
              {revError && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 8 }}>{revError}</div>}
              <div style={{ marginBottom: 10 }}>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  style={{ padding: 6, background: "#262626", color: "#fff", border: "1px solid #444", borderRadius: 4 }}
                >
                  <option value={5}>5 — Отлично</option>
                  <option value={4}>4 — Хорошо</option>
                  <option value={3}>3 — Нормально</option>
                  <option value={2}>2 — Плохо</option>
                  <option value={1}>1 — Ужасно</option>
                </select>
              </div>
              <textarea
                required
                minLength={3}
                rows={3}
                placeholder="Ваш комментарий..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #444", borderRadius: 4, marginBottom: 10, boxSizing: "border-box" }}
              />
              <button
                type="submit"
                disabled={revLoading}
                style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
              >
                {revLoading ? "Отправка..." : "Отправить"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCard;