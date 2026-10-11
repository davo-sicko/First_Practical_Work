export const CartModal = ({
  cart,
  user,
  onClose,
  onRemoveItem,
  onCheckout,
}) => {
  const subtotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  const userDiscount = user ? Number(user.discount_percent) || 0 : 0;
  const total = Math.round(subtotal * (1 - userDiscount / 100));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cart-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Корзина услуг</h3>
        {cart.length === 0 ? (
          <p>Корзина пуста</p>
        ) : (
          <>
            <ul className="cart-list">
              {cart.map((item, index) => (
                <li key={index} className="cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <div>{item.finalPrice} ₽</div>
                  </div>
                  <button onClick={() => onRemoveItem(index)}>✕</button>
                </li>
              ))}
            </ul>
            <div className="cart-summary">
              <div>Сумма: {subtotal} ₽</div>
              {userDiscount > 0 && (
                <div className="discount-applied">
                  Купон {user.discount_coupon}: -{userDiscount}% (-{subtotal - total} ₽)
                </div>
              )}
              <div className="cart-total">К оплате: {total} ₽</div>
            </div>
            <button
              className="primary-button checkout-button"
              onClick={() => onCheckout(total)}
            >
              Записаться на сервис
            </button>
          </>
        )}
        <div className="modal-actions">
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};