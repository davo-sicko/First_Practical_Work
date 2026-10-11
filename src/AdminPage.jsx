import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./AuthContext";

export default function AdminPage() {
  const { user, ready } = useAuth();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    if (user.role !== "admin") {
      setLoading(false);
      return;
    }

    api
      .getCategories()
      .then(setCategories)
      .catch(() => setError("Не удалось загрузить категории"))
      .finally(() => setLoading(false));
  }, [user, ready]);

  if (!ready) {
    return <div className="page"><div className="state-message">Проверка авторизации...</div></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <div className="page">
        <h2>Доступ запрещён</h2>
        <p className="muted">У вас нет прав администратора для просмотра этой страницы.</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("shop_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Название категории должно содержать минимум 2 символа");
      return;
    }

    try {
      const category = await api.addCategory(trimmed);
      setCategories((prev) => [...prev, category]);
      setName("");
      setSuccess("Категория успешно создана");
    } catch (err) {
      setError(err.message || "Не удалось создать категорию");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Удалить категорию? Товары будут перенесены в \"Без категории\".")) return;
    setError("");
    setSuccess("");

    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((category) => category.category_id !== id));
      setSuccess("Категория удалена. Товары перенесены в \"Без категории\"");
    } catch (err) {
      setError(err.message || "Не удалось удалить категорию");
    }
  };

  return (
    <div className="page">
      <h2>Административная панель</h2>
      <button type="button" onClick={handleLogout} style={{ marginBottom: 16 }}>Выйти из аккаунта</button>
      <div className="card" style={{ maxWidth: 640, marginTop: 20 }}>
        <h3>Создать категорию</h3>
        <form onSubmit={handleAddCategory} className="form">
          <label>
            Название категории
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Акции" />
          </label>
          <button type="submit">Добавить категорию</button>
        </form>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>

      <div className="card" style={{ maxWidth: 640, marginTop: 24 }}>
        <h3>Существующие категории</h3>
        {loading ? (
          <div className="state-message">Загрузка...</div>
        ) : categories.length === 0 ? (
          <p className="muted">Категорий пока нет.</p>
        ) : (
          <ul className="plain-list">
            {categories.map((category) => (
              <li key={category.category_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(category.category_id)}
                  className="btn-danger"
                  disabled={category.is_default || category.name === "Без категории"}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
