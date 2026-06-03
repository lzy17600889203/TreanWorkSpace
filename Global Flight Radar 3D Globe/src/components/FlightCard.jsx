import React from 'react'
import './FlightCard.css'

const FlightCard = ({ flight, onClose }) => {
  return (
    <div className="flight-card-overlay" onClick={onClose}>
      <div className="flight-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <div className="card-header">
          <h2>{flight.flightNumber}</h2>
          <span className={`status ${flight.delayed ? 'delayed' : 'on-time'}`}>
            {flight.delayed ? '延误' : '准点'}
          </span>
        </div>
        
        <div className="airline">{flight.airline}</div>
        
        <div className="route">
          <div className="city">
            <div className="city-name">{flight.origin}</div>
            <div className="city-coords">{flight.originLat.toFixed(2)}°, {flight.originLon.toFixed(2)}°</div>
          </div>
          
          <div className="route-line">
            <div className="dot"></div>
            <div className="line"></div>
            <div className="dot"></div>
          </div>
          
          <div className="city">
            <div className="city-name">{flight.destination}</div>
            <div className="city-coords">{flight.destLat.toFixed(2)}°, {flight.destLon.toFixed(2)}°</div>
          </div>
        </div>
        
        <div className="progress-section">
          <div className="progress-label">飞行进度</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${flight.progress * 100}%` }}></div>
          </div>
          <div className="progress-text">{Math.round(flight.progress * 100)}%</div>
        </div>
      </div>
    </div>
  )
}

export default FlightCard
