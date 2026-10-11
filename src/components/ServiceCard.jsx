export const ServiceCard = ({ service, onAddToCart }) => {
  const finalPrice = service.has_discount
    ? Math.round(service.price * (1 - service.discount_percent / 100))
    : service.price;

  return (
    <div className="card">
      <div className="card-badge-container">
        <span className="card-category">{service.category_name}</span>
        {service.has_discount && (
          <span className="card-discount">-{service.discount_percent}%</span>
        )}
      </div>
      <h4 className="card-title">{service.name}</h4>
      <p className="card-description">{service.description}</p>
      <div className="card-duration">⏳ {service.duration} мин.</div>
      <div className="card-footer">
        <div className="card-price">
          {service.has_discount ? (
            <>
              <span className="old-price">{service.price} ₽</span>
              <span className="new-price">{finalPrice} ₽</span>
            </>
          ) : (
            <span className="regular-price">{service.price} ₽</span>
          )}
        </div>
        <button
          className="card-button"
          onClick={() => onAddToCart({ ...service, finalPrice })}
        >
          В корзину
        </button>
      </div>
    </div>
  );
};