const API_URL = "http://localhost:3001/api";
const TOKEN_KEY = "shop_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Сервер временно недоступен");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw new Error(data?.message || "Ошибка запроса");
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body });
const put = (path, body) => request(path, { method: "PUT", body });
const patch = (path, body) => request(path, { method: "PATCH", body });
const del = (path) => request(path, { method: "DELETE" });

export const api = {
  health: () => request("/health"),
  me: () => request("/auth/me"),
  login: (email, password) => post("/auth/login", { email, password }),
  register: (data) => post("/auth/register", data),
  requestPasswordReset: (email) => post("/auth/forgot-password", { email }),
  resetPassword: (email, code, password) => post("/auth/reset-password", { email, code, password }),
  updateProfile: (data) => put("/profile", data),
  getProducts: () => request("/products"),
  getCategories: () => request("/categories"),
  addCategory: (name) => post("/categories", { name }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),
  getCart: () => request("/cart"),
  addToCart: (productId, quantity = 1) => post("/cart", { product_id: productId, quantity }),
  setCartQty: (productId, quantity) => patch(`/cart/${productId}`, { quantity }),
  removeFromCart: (productId) => del(`/cart/${productId}`),
  createOrder: (data) => post("/orders", data),
  getMyOrders: () => request("/orders/my"),
  payOrder: (id) => post(`/orders/${id}/pay`),
};