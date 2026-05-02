import React from "react";

const formatDuration = (seconds) => `${Math.round(seconds / 60)} mins`;
const formatDistance = (meters) => `${(meters / 1000).toFixed(1)} km`;
const getRouteTone = (index) =>
  ["Primary", "Alternate", "Fallback"][index] || "Route";

function RoutePanel({ selectedRoute, routes, onSelectRoute, sliderTime }) {
  return (
    <aside className="route-panel">
      <h2>Route Intelligence</h2>
      <p className="panel-subtitle">
        Live route preview and mock congestion insights.
      </p>

      <div className="insight-banner">
        <span>Prediction horizon</span>
        <strong>{sliderTime} minutes ahead</strong>
      </div>

      {selectedRoute ? (
        <>
          <div className="stat-card">
            <span>Estimated Travel Time</span>
            <strong>{formatDuration(selectedRoute.duration)}</strong>
          </div>
          <div className="stat-card">
            <span>Distance</span>
            <strong>{formatDistance(selectedRoute.distance)}</strong>
          </div>
          <div className="stat-card">
            <span>Risk Score</span>
            <strong>{selectedRoute.riskScore}%</strong>
          </div>
          <div className="recommendation-card">
            <span>Recommendation</span>
            <strong>Best route selected</strong>
          </div>
        </>
      ) : (
        <div className="empty-panel">
          Enter a source and destination to view route options.
        </div>
      )}

      <div className="route-list">
        <h3>Available Routes</h3>
        {routes.length === 0 ? (
          <p className="muted-text">No routes loaded yet.</p>
        ) : (
          routes.map((route, index) => (
            <div
              key={route.id}
              className={`route-item ${
                selectedRoute?.id === route.id ? "selected-route-item" : ""
              }`}
              onClick={() => onSelectRoute(route.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelectRoute(route.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="route-copy">
                <span>Route {index + 1}</span>
                <small>
                  {selectedRoute?.id === route.id
                    ? "Selected corridor"
                    : "Tap to compare"}
                </small>
              </div>
              <div className="route-meta">
                <em>{getRouteTone(index)}</em>
                <strong>
                  {formatDuration(route.duration)} -{" "}
                  {formatDistance(route.distance)}
                </strong>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="legend">
        <h3>Traffic Legend</h3>
        <div className="legend-item">
          <span className="legend-dot green" />
          <span>Low congestion</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot yellow" />
          <span>Medium congestion</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot red" />
          <span>High congestion</span>
        </div>
      </div>
    </aside>
  );
}

export default RoutePanel;
