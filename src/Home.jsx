import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api/client";
import { AsideCategories } from "./components/AsideCategories";
import { ProductCard } from "./ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getProducts(), api.getCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleProductAdded = (prod) => {
    setNotification(prod);
    setTimeout(() => setNotification(null), 5000);
  };

  const q = query.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      (selected.length === 0 || selected.includes(p.category_id)) &&
      (!q || `${p.name} ${p.description || ""} ${p.category_name}`.toLowerCase().includes(q))
  );

  return (
    <div className="main-content">
      <AsideCategories
        categories={categories}
        selectedCategories={selected}
        onToggleCategory={toggleCategory}
      />
      <main className="catalog">
        <input
          className="search"
          type="text"
          placeholder="Поиск по товарам..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Программный переход в корзину при добавлении товара */}
        {notification && (
          <div className="toast">
            <span>Товар <b>«{notification.name}»</b> добавлен в корзину!</span>
            <button className="btn-small" onClick={() => navigate("/cart")}>
              Перейти в корзину →
            </button>
          </div>
        )}

        {loading ? (
          <div className="state-message">Загрузка каталога...</div>
        ) : visible.length === 0 ? (
          <div className="state-message">Товары не найдены</div>
        ) : (
          <div className="grid">
            {visible.map((p) => (
              <ProductCard key={p.product_id} product={p} onAdded={handleProductAdded} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}