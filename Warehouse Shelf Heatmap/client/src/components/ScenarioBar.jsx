import React from 'react';

const ScenarioBar = ({ onLoadScenario }) => {
  const scenarios = [
    { name: 'double11', label: '🎆 双十一爆仓', description: '库存告急' },
    { name: 'normal', label: '📊 日常状态', description: '平稳周转' },
    { name: 'cold', label: '❄️ 冷区分布', description: '滞销商品' },
    { name: 'restock', label: '🚚 补货动态', description: '新入库' }
  ];

  return (
    <div className="scenario-bar">
      {scenarios.map(scenario => (
        <button
          key={scenario.name}
          className={`scenario-btn ${scenario.name}`}
          onClick={() => onLoadScenario(scenario.name)}
        >
          {scenario.label}
        </button>
      ))}
    </div>
  );
};

export default ScenarioBar;
