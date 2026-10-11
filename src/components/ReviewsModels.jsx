import React, { useState, useEffect } from "react";

export default function ReviewsModal({ product, user, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchReviews();
  }, [product.product_id]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/products/${product.product_id}/reviews`);
      const data = await res.json();
      if (res.ok) setReviews(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setError("Для отправки отзыва необходимо войти в аккаунт");

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:3001/api/products/${product.product_id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setComment("");
      fetchReviews();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
      <div style={{ background: "#1c1c1c", color: "#fff", width: 520, maxHeight: "85vh", overflowY: "auto", borderRadius: 8, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Отзывы: {product.name}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Список отзывов */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {reviews.length === 0 ? (
            <p style={{ color: "#888" }}>Пока нет отзывов. Будьте первым!</p>
          ) : (
            reviews.map((r) => (
              <div key={r.review_id} style={{ background: "#262626", padding: 12, borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong>{r.author_name}</strong>
                  <span style={{ color: "#eab308" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <div style={{ fontSize: 14, color: "#ddd" }}>{r.comment}</div>
              </div>
            ))
          )}
        </div>

        {/* Форма добавления отзыва */}
        {user ? (
          <form onSubmit={handleSubmit} style={{ borderTop: "1px solid #333", paddingTop: 16 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Оставить отзыв</h4>
            {error && <div style={{ color: "#f87171", marginBottom: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, marginRight: 8 }}>Оценка:</label>
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
              rows={3}
              placeholder="Поделитесь вашим мнением о товаре..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ width: "100%", padding: 8, background: "#262626", color: "#fff", border: "1px solid #444", borderRadius: 4, marginBottom: 10 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "8px 16px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
            >
              {loading ? "Отправка..." : "Опубликовать отзыв"}
            </button>
          </form>
        ) : (
          <p style={{ color: "#888", fontSize: 13, borderTop: "1px solid #333", paddingTop: 12 }}>
            Войдите в аккаунт, чтобы оставить свой отзыв.
          </p>
        )}
      </div>
    </div>
  );
}