import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !password) return setError("Заполните все поля");

    setLoading(true);
    try {
      await login(email.trim(), password);
      // Программный переход после входа -> /dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await api.requestPasswordReset(email.trim());
      setMessage(result.message);
      setMode("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await api.resetPassword(email.trim(), resetCode.trim(), newPassword);
      setMessage(result.message);
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setMode("login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page narrow">
      <h2>{mode === "login" ? "Вход в систему" : mode === "request-reset" ? "Сброс пароля" : "Введите код из письма"}</h2>
      <form className="form" onSubmit={mode === "login" ? handleSubmit : mode === "request-reset" ? handleRequestReset : handleResetPassword} noValidate>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {mode === "login" && (
          <label>
            Пароль
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
        )}
        {mode === "reset" && (
          <>
            <label>
              Код из письма
              <input value={resetCode} onChange={(e) => setResetCode(e.target.value)} inputMode="numeric" maxLength={6} required />
            </label>
            <label>
              Новый пароль
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
            </label>
          </>
        )}
        {error && <div className="error-message">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Подождите..." : mode === "login" ? "Войти" : mode === "request-reset" ? "Отправить код" : "Сбросить пароль"}
        </button>
      </form>
      {message && <div className="success-message">{message}</div>}
      {mode === "login" ? (
        <button className="btn-small" type="button" style={{ marginTop: 12 }} onClick={() => { setError(""); setMessage(""); setMode("request-reset"); }}>
          Забыли пароль?
        </button>
      ) : (
        <button className="btn-small" type="button" style={{ marginTop: 12 }} onClick={() => { setError(""); setMessage(""); setMode("login"); }}>
          Вернуться ко входу
        </button>
      )}
    </div>
  );
}