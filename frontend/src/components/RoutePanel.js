import React from "react";

const formatDuration = (seconds) => `${Math.round(seconds / 60)} mins`;
const formatDistance = (meters) => `${(meters / 1000).toFixed(1)} km`;
const formatConfidence = (score) => `${Math.round(score * 100)}%`;
const formatPredictionTime = (value) => {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

function RoutePanel({
  selectedRoute,
  routes,
  onSelectRoute,
  sliderTime,
  futureTime,
  predictionContext
}) {
  return (
    <aside className="route-panel">
      <h2>Route Intelligence</h2>
      <p className="panel-subtitle">
        Backend-ranked route options powered by current TomTom data and
        future-time ML scoring.
      </p>

      <div className="insight-banner">
        <span>Prediction horizon</span>
        <strong>{sliderTime} minutes ahead</strong>
      </div>
      <div className="insight-banner">
        <span>Selected time</span>
        <strong>{formatPredictionTime(futureTime)}</strong>
      </div>
      {predictionContext ? (
        <div className="insight-banner">
          <span>Backend used</span>
          <strong>
            {`${formatPredictionTime(predictionContext.future_time)} | hour ${predictionContext.future_hour} | day ${predictionContext.future_day}`}
          </strong>
        </div>
      ) : null}

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
            <span>Confidence</span>
            <strong>{formatConfidence(selectedRoute.confidence)}</strong>
          </div>
          <div className="recommendation-card">
            <span>Recommended Route</span>
            <strong>
              {selectedRoute.priority === "high"
                ? "Best route selected"
                : "Comparison route selected"}
            </strong>
            <small>{selectedRoute.riskMessage}</small>
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
                  {route.priority === "high"
                    ? "Recommended"
                    : route.priority === "medium"
                      ? "Backup option"
                      : "Higher delay risk"}
                </small>
              </div>
              <div className="route-meta">
                <em style={{ color: route.color }}>{route.priority.toUpperCase()}</em>
                <strong>
                  {formatDuration(route.duration)} -{" "}
                  {formatDistance(route.distance)}
                </strong>
                <small>Confidence: {formatConfidence(route.confidence)}</small>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="legend">
        <h3>Route Ranking</h3>
        <div className="legend-item">
          <span className="legend-dot green" />
          <span>High priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot yellow" />
          <span>Medium priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot red" />
          <span>Low priority</span>
        </div>
      </div>
    </aside>
  );
}

export default RoutePanel;
