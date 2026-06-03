import React from 'react'
import './SceneSelector.css'

const SceneSelector = ({ scenes, currentScene, onSceneChange }) => {
  return (
    <div className="scene-selector">
      {Object.entries(scenes).map(([key, scene]) => (
        <button
          key={key}
          className={`scene-btn ${currentScene === key ? 'active' : ''}`}
          onClick={() => onSceneChange(key)}
        >
          {scene.name}
        </button>
      ))}
    </div>
  )
}

export default SceneSelector
