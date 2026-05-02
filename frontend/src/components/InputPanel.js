import React from "react";

function InputPanel({
  source,
  destination,
  setSource,
  setDestination,
  onGetRoute,
  onSwapLocations,
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
              setSource("Kharadi, Pune");
              setDestination("Baner, Pune");
            }}
          >
            Kharadi to Baner
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              setSource("Pimpri, Pune");
              setDestination("Magarpatta, Pune");
            }}
          >
            Pimpri to Magarpatta
          </button>
        </div>
      </div>

      <div className="input-grid">
        <label className="input-card">
          <span>Source</span>
          <input
            type="text"
            placeholder="Source location"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>
        <label className="input-card">
          <span>Destination</span>
          <input
            type="text"
            placeholder="Destination location"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
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
          <strong>Mock traffic colors</strong>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export default InputPanel;
