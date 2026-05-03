import React from "react";
import {
  formatConfidence,
  formatDistance,
  formatDuration,
  formatMinutesAhead,
  formatModelContext,
  formatSelectedTime
} from "../utils/formatters";

function RoutePanel({
  selectedRoute,
  routes,
  onSelectRoute,
  sliderTime,
  futureTime,
  predictionContext
}) {
  const longestDuration = routes.reduce(
    (maxDuration, route) => Math.max(maxDuration, route.duration || 0),
    0
  );

  const getRouteStatusLabel = (priority) => {
    if (priority === "high") {
      return "Recommended";
    }

    if (priority === "medium") {
      return "Backup option";
    }

    return "Higher delay risk";
  };

  return (
    <aside className="route-panel">
      <h2>Route Intelligence</h2>
      <p className="panel-subtitle">
        Live route options ranked using current TomTom data and future-time
        model scoring.
      </p>

      <div className="insight-banner">
        <span>Prediction Window</span>
        <strong>{formatMinutesAhead(sliderTime)}</strong>
      </div>
      <div className="insight-banner">
        <span>Selected Time</span>
        <strong>{formatSelectedTime(futureTime)}</strong>
      </div>
      {predictionContext ? (
        <div className="insight-banner">
          <span>Model Context</span>
          <strong>{formatModelContext(predictionContext)}</strong>
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
            <span>Prediction Confidence</span>
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
                <small>{getRouteStatusLabel(route.priority)}</small>
              </div>
              <div className="route-meta">
                <em style={{ color: route.color }}>{getRouteStatusLabel(route.priority)}</em>
                <strong>
                  {formatDuration(route.duration)} -{" "}
                  {formatDistance(route.distance)}
                </strong>
                <small>
                  {`Prediction Confidence: ${formatConfidence(route.confidence)}`}
                </small>
              </div>
            </div>
          ))
        )}
      </div>

      {routes.length > 0 ? (
        <div className="comparison-chart">
          <h3>Travel Time Comparison</h3>
          <div className="comparison-list">
            {routes.map((route, index) => {
              const barWidth =
                longestDuration > 0
                  ? (route.duration / longestDuration) * 100
                  : 0;
              const isBestRoute = route.priority === "high";

              return (
                <div
                  key={`${route.id}-comparison`}
                  className={`comparison-row ${
                    isBestRoute ? "comparison-row-best" : ""
                  }`}
                >
                  <div className="comparison-copy">
                    <span>{`Route ${index + 1}`}</span>
                    <small>{getRouteStatusLabel(route.priority)}</small>
                  </div>
                  <div className="comparison-bar-track" aria-hidden="true">
                    <div
                      className={`comparison-bar-fill ${
                        isBestRoute ? "comparison-bar-fill-best" : ""
                      }`}
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: route.color
                      }}
                    />
                  </div>
                  <strong>{formatDuration(route.duration)}</strong>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="legend">
        <h3>Route Ranking</h3>
        <div className="legend-item">
          <span className="legend-dot green" />
          <span>Recommended</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot orange" />
          <span>Backup option</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot red" />
          <span>Higher delay risk</span>
        </div>
      </div>
    </aside>
  );
}

export default RoutePanel;
