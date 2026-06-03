import React from 'react';

const Sidebar = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📦 商品分类</h2>
      </div>
      <div className="category-list">
        <div 
          className={`category-item all ${!selectedCategory ? 'selected' : ''}`}
          onClick={() => onSelectCategory(null)}
        >
          <div className="category-name">全部分类</div>
          <div className="category-description">查看所有货架</div>
        </div>
        {categories.map(category => (
          <div 
            key={category.id}
            className={`category-item ${selectedCategory?.id === category.id ? 'selected' : ''}`}
            onClick={() => onSelectCategory(category)}
          >
            <div className="category-name">{category.name}</div>
            <div className="category-description">{category.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
