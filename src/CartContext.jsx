import { createContext, useCallback, useContext, useEffect, useReducer, useState } from "react";
import { api } from "./api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const initialCart = {
  items: [],
  subtotal: 0,
  discount_percent: 0,
  discount_label: null,
  discount_amount: 0,
  total: 0,
};

function cartReducer(state, action) {
  switch (action.type) {
    case "SET_CART":
      return action.payload;
    case "CLEAR_CART":
      return initialCart;
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, dispatch] = useReducer(cartReducer, initialCart);
  const [error, setError] = useState("");
  const [loadedUserId, setLoadedUserId] = useState(null);

  const refreshCart = useCallback(async () => {
    if (!user || user.role !== "user") {
      dispatch({ type: "CLEAR_CART" });
      setError("");
      setLoadedUserId(null);
      return;
    }
    try {
      const data = await api.getCart();
      dispatch({ type: "SET_CART", payload: data });
      setError("");
      setLoadedUserId(user.user_id);
    } catch (err) {
      setError(err.message || "Не удалось загрузить корзину");
      setLoadedUserId(user.user_id);
    }
  }, [user]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const data = await api.addToCart(productId, quantity);
      dispatch({ type: "SET_CART", payload: data });
      setError("");
    } catch (err) {
      setError(err.message || "Не удалось добавить товар в корзину");
      throw err;
    }
  };

  const setQuantity = async (productId, quantity) => {
    try {
      const data = await api.setCartQty(productId, quantity);
      dispatch({ type: "SET_CART", payload: data });
      setError("");
    } catch (err) {
      setError(err.message || "Не удалось изменить количество товара");
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const data = await api.removeFromCart(productId);
      dispatch({ type: "SET_CART", payload: data });
      setError("");
    } catch (err) {
      setError(err.message || "Не удалось удалить товар из корзины");
    }
  };

  const clearError = () => setError("");
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        count,
        loading: user?.role === "user" && loadedUserId !== user.user_id,
        error,
        clearError,
        addToCart,
        setQuantity,
        removeFromCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}