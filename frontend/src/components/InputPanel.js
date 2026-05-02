import React from "react";

function InputPanel({
  source,
  destination,
  locationOptions,
  setSource,
  setDestination,
  onGetRoute,
  onSwapLocations,
  futureTime,
  onFutureTimeChange,
  loading,
  error
}) {
  return (
    <div className="input-panel">
      <div className="input-panel-top">
        <div className="brand-block">
          <p className="eyebrow">Urban Logistics Digital Twin</p>
          <h2>Route Planning Console</h2>
        </div>

        <div className="preset-chip-row">
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              setSource("Swargate");
              setDestination("Hinjewadi");
            }}
          >
            Swargate to Hinjewadi
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              setSource("Kothrud");
              setDestination("Hadapsar");
            }}
          >
            Kothrud to Hadapsar
          </button>
        </div>
      </div>

      <div className="input-grid">
        <label className="input-card">
          <span>Source</span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <label className="input-card">
          <span>Destination</span>
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <label className="input-card">
          <span>Future Time</span>
          <input
            type="datetime-local"
            value={futureTime}
            onChange={(event) => onFutureTimeChange(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="swap-button"
          onClick={onSwapLocations}
          aria-label="Swap source and destination"
        >
          Swap
        </button>
        <button type="button" onClick={onGetRoute} disabled={loading}>
          {loading ? "Loading..." : "Get Route"}
        </button>
      </div>

      <div className="input-footer">
        <div className="mini-stat">
          <span>Alternatives</span>
          <strong>Up to 3 routes</strong>
        </div>
        <div className="mini-stat">
          <span>Simulation</span>
          <strong>Backend-ranked routes</strong>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export default InputPanel;
