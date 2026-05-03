import React, { useMemo } from "react";

function RouteComparisonPanel({ routes = [], selectedRouteId, onSelectRoute }) {
  const sortedRoutes = useMemo(
    () => [...routes].sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0)),
    [routes]
  );

  const maxDuration = useMemo(
    () => Math.max(...sortedRoutes.map((route) => route.duration ?? 0), 1),
    [sortedRoutes]
  );

  const isWorstRoute = (route) =>
    route.duration === sortedRoutes[sortedRoutes.length - 1]?.duration;

  const routeLabel = (_route, index) => `Route ${index + 1}`;

  const routeStatus = (route, index) => {
    if (index === 0) return "Recommended";
    if (isWorstRoute(route)) return "Higher delay risk";
    return "Backup option";
  };

  const statusColorClass = (route, index) => {
    if (index === 0) return "route-tag--green";
    if (isWorstRoute(route)) return "route-tag--red";
    return "route-tag--yellow";
  };

  return (
    <aside className="route-comparison-panel">
      <div className="route-comparison-header">
        <div>
          <p className="route-comparison-kicker">Route intelligence</p>
          <h2>Route Comparison</h2>
        </div>
        <div className="route-comparison-summary">
          <span>{routes.length} route{routes.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="route-comparison-list">
        {sortedRoutes.map((route, index) => {
          const selected = selectedRouteId === route.id;
          const duration = route.duration ?? 0;
          const widthPercent = Math.max((duration / maxDuration) * 100, 8);
          const status = routeStatus(route, index);
          const distance = Number(route.distance ?? 0).toFixed(1);
          const confidence = Number(route.confidence ?? 0).toFixed(0);

          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onSelectRoute?.(route.id)}
              className={`route-comparison-row ${selected ? "route-comparison-row--selected" : ""}`}
            >
              <div className="route-comparison-row__top">
                <div className="route-comparison-row__meta">
                  <span className="route-comparison-row__title">{routeLabel(route, index)}</span>
                  <span className={`route-tag ${statusColorClass(route, index)}`}>
                    {status}
                  </span>
                </div>

                <div className="route-comparison-row__time">
                  <strong>{duration} min</strong>
                </div>
              </div>

              <div className="route-comparison-bar-wrap">
                <div className="route-bar-track">
                  <div
                    className={`route-bar-fill ${statusColorClass(route, index)}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>

              <div className="route-comparison-row__bottom">
                <span>{distance} km</span>
                <span>Prediction Confidence: {confidence}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default RouteComparisonPanel;
