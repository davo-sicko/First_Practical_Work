export function AsideCategories({ categories, selectedCategories, onToggleCategory }) {
  return (
    <aside className="aside">
      <h3>Категории</h3>
      <div className="category-list">
        {categories.map((c) => (
          <label key={c.category_id} className="category-item">
            <input
              type="checkbox"
              checked={selectedCategories.includes(c.category_id)}
              onChange={() => onToggleCategory(c.category_id)}
            />
            {c.name}
          </label>
        ))}
      </div>
    </aside>
  );
}