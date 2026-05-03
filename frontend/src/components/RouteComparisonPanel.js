import React, { useMemo } from "react";

function RouteComparisonPanel({
  routes = [],
  selectedRouteId,
  onSelectRoute,
  waitRecommendation
}) {
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

  const trendPoints = waitRecommendation?.trend_points || [];
  const trendMax = Math.max(
    ...trendPoints.map((point) => Number(point.travel_time ?? 0)),
    1
  );

  const trendDirectionLabel = (() => {
    if (waitRecommendation?.trend_direction === "improving") {
      return "\u2193 improving";
    }

    if (waitRecommendation?.trend_direction === "worsening") {
      return "\u2191 worsening";
    }

    return "\u2192 stable";
  })();

  const trendDirectionClass = (() => {
    if (waitRecommendation?.trend_direction === "improving") {
      return "decision-trend-badge--improving";
    }

    if (waitRecommendation?.trend_direction === "worsening") {
      return "decision-trend-badge--worsening";
    }

    return "decision-trend-badge--stable";
  })();

  const bestRoute = sortedRoutes[0] || null;

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

      {bestRoute ? (
        <div className="comparison-highlight-card">
          <span className="comparison-highlight-card__eyebrow">Fastest visible option</span>
          <strong>{`${bestRoute.duration} min across ${Number(
            bestRoute.distance ?? 0
          ).toFixed(1)} km`}</strong>
          <p>
            Select any route to inspect it on the map. Recommended options stay
            highlighted so the decision is easier to scan.
          </p>
        </div>
      ) : (
        <div className="comparison-empty-card">
          <strong>No route comparison yet</strong>
          <p>
            Run a prediction to compare route time, confidence, and delay risk
            side by side.
          </p>
        </div>
      )}

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

      {waitRecommendation ? (
        <div className="decision-support-stack">
          <div
            className={`decision-card decision-card--primary ${
              waitRecommendation.action === "WAIT"
                ? "decision-card--wait"
                : "decision-card--leave"
            }`}
          >
            <div className="decision-card__header">
              <span className="decision-card__eyebrow">Smart Suggestion</span>
            </div>
            <div className="decision-card__content">
              {waitRecommendation.action === "WAIT" ? (
                <p className="decision-card__headline">
                  <span className="decision-card__icon" aria-hidden="true">
                    ⏳
                  </span>
                  <span>
                    Wait <strong>{waitRecommendation.wait_minutes} mins</strong>
                    {" "}
                    - Save <strong>~{waitRecommendation.time_saved} mins</strong>
                  </span>
                </p>
              ) : (
                <p className="decision-card__headline">
                  <span className="decision-card__icon" aria-hidden="true">
                    🚀
                  </span>
                  <span>Best to leave now</span>
                </p>
              )}
              <small>{waitRecommendation.message}</small>
              {waitRecommendation.insight ? (
                <p className="decision-card__insight-inline">
                  {waitRecommendation.insight}
                </p>
              ) : null}
            </div>
          </div>

          <div className="decision-card">
            <div className="decision-card__header">
              <span className="decision-card__eyebrow">Traffic Trend</span>
              <span className={`decision-trend-badge ${trendDirectionClass}`}>
                {trendDirectionLabel}
              </span>
            </div>
            <div className="decision-trend-list">
              {trendPoints.map((point) => {
                const travelTime = Number(point.travel_time ?? 0);
                const widthPercent = Math.max((travelTime / trendMax) * 100, 10);

                return (
                  <div
                    key={`${point.label}-${point.offset_minutes}`}
                    className="decision-trend-row"
                  >
                    <div className="decision-trend-row__copy">
                      <span>{point.label}</span>
                      <strong>{travelTime.toFixed(1)} mins</strong>
                    </div>
                    <div className="decision-trend-row__bar">
                      <div
                        className="decision-trend-row__fill"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export default RouteComparisonPanel;
