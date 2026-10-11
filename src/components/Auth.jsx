import React, { useState } from "react";

export default function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "+7 (900) 123-45-67",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isRegister ? "http://localhost:3001/api/auth/register" : "http://localhost:3001/api/auth/login";
    const body = isRegister
      ? formData
      : { email: formData.email, password: formData.password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Ошибка авторизации");

      localStorage.setItem("token", data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "40px auto", padding: 24, background: "#1a1a1a", color: "#fff", borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => { setIsRegister(false); setError(""); }}
          style={{
            flex: 1, padding: "10px", background: !isRegister ? "#22c55e" : "#2a2a2a",
            color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold"
          }}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => { setIsRegister(true); setError(""); }}
          style={{
            flex: 1, padding: "10px", background: isRegister ? "#22c55e" : "#2a2a2a",
            color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold"
          }}
        >
          Регистрация
        </button>
      </div>

      <h2 style={{ marginBottom: 16 }}>{isRegister ? "Создание аккаунта" : "Вход в систему"}</h2>

      {error && (
        <div style={{ padding: 10, background: "#451a1a", border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {isRegister && (
          <>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#aaa" }}>ФИО</label>
              <input
                required
                name="full_name"
                placeholder="Иванов Иван Иванович"
                value={formData.full_name}
                onChange={handleChange}
                style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #333", background: "#262626", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#aaa" }}>Телефон</label>
              <input
                required
                name="phone"
                placeholder="+7 (900) 123-45-67"
                value={formData.phone}
                onChange={handleChange}
                style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #333", background: "#262626", color: "#fff" }}
              />
            </div>
          </>
        )}

        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#aaa" }}>Email</label>
          <input
            required
            type="email"
            name="email"
            placeholder="example@shop.local"
            value={formData.email}
            onChange={handleChange}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #333", background: "#262626", color: "#fff" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#aaa" }}>Пароль</label>
          <input
            required
            type="password"
            name="password"
            placeholder="Минимум 6 символов"
            value={formData.password}
            onChange={handleChange}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #333", background: "#262626", color: "#fff" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8, padding: 12, background: "#22c55e", color: "#fff",
            border: "none", borderRadius: 6, cursor: loading ? "wait" : "pointer", fontWeight: "bold"
          }}
        >
          {loading ? "Загрузка..." : isRegister ? "Зарегистрироваться" : "Войти"}
        </button>
      </form>
    </div>
  );
}