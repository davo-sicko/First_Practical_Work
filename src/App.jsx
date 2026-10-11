import { BrowserRouter, Routes, Route, NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { CartProvider, useCart } from "./CartContext";
import Home from "./Home";
import Cart from "./Cart";
import Login from "./Login";
import Dashboard from "./Dashboard";
import AdminPage from "./AdminPage";
import { api } from "./api/client";

function MaintenancePage() {
  return (
    <div className="page">
      <h2>Сервис временно недоступен</h2>
      <p className="muted">Ведутся технические работы. Попробуйте зайти позже.</p>
    </div>
  );
}

function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { count } = useCart();
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    let active = true;
    const checkBackend = () => {
      api.health()
        .then(() => { if (active) setBackendOnline(true); })
        .catch(() => { if (active) setBackendOnline(false); });
    };
    checkBackend();
    const intervalId = window.setInterval(checkBackend, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (backendOnline === null) {
    return <div className={`layout ${theme}`}><div className="state-message">Проверка соединения с сервером...</div></div>;
  }

  if (!backendOnline) {
    return (
      <div className={`layout ${theme}`}>
        <header className="header">
        </header>
        <MaintenancePage />
      </div>
    );
  }

  const navClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <div className={`layout ${theme}`}>
      <header className="header">
        <nav className="nav">
          <NavLink to="/" end className={navClass}>Каталог</NavLink>
          {user?.role !== "admin" && (
            <NavLink to="/cart" className={navClass}>
              Корзина {count > 0 && <span className="badge">{count}</span>}
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/dashboard" className={navClass}>Кабинет</NavLink>
              {user.role === "admin" && <NavLink to="/admin" className={navClass}>Админ</NavLink>}
            </>
          ) : (
            <NavLink to="/login" className={navClass}>Вход</NavLink>
          )}
        </nav>
        <div className="header-actions">
          <button onClick={toggleTheme}>
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<div className="page"><h2>404 — Страница не найдена</h2></div>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ThemeProvider>
            <Layout />
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}