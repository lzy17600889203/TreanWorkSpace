import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WarehouseScene from './components/WarehouseScene';
import Sidebar from './components/Sidebar';
import ScenarioBar from './components/ScenarioBar';
import './App.css';

function App() {
  const [categories, setCategories] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchShelves();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:3003/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchShelves = async (categoryId = null) => {
    try {
      const url = categoryId 
        ? `http://localhost:3003/api/shelves?categoryId=${categoryId}`
        : 'http://localhost:3003/api/shelves/all';
      const response = await axios.get(url);
      setShelves(response.data);
    } catch (error) {
      console.error('Error fetching shelves:', error);
    }
  };

  const loadScenario = async (scenarioName) => {
    try {
      const response = await axios.post(`http://localhost:3003/api/scenario/${scenarioName}`);
      setShelves(response.data);
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    fetchShelves(category ? category.id : null);
  };

  return (
    <div className="app">
      <Sidebar 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
      />
      <div className="main-content">
        <div className="header">
          <h1>3D 仓库可视化系统</h1>
        </div>
        <ScenarioBar onLoadScenario={loadScenario} />
        <div className="canvas-container">
          <WarehouseScene shelves={shelves} />
        </div>
      </div>
    </div>
  );
}

export default App;
