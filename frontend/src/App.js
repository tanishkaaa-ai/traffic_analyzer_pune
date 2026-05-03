import React, { useEffect, useState } from "react";
import axios from "axios";
import InputPanel from "./components/InputPanel";
import MapComponent from "./components/MapComponent";
import RouteComparisonPanel from "./components/RouteComparisonPanel";
import {
  formatMinutesAhead,
  formatSelectedTime
} from "./utils/formatters";

const MAPBOX_TOKEN =
  process.env.REACT_APP_MAPBOX_TOKEN || "YOUR_MAPBOX_TOKEN";
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";
const PUNE_CENTER = [73.8567, 18.5204];
const LOCATION_OPTIONS = [
  "Hadapsar",
  "Hinjewadi",
  "Kothrud",
  "Swargate",
  "University"
];

const buildLocalDateTimeValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const buildFutureTimeIso = (futureDate) => {
  const timezoneOffsetMinutes = -futureDate.getTimezoneOffset();
  const offsetSign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(timezoneOffsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, "0");
  const offsetMinutes = String(absoluteOffsetMinutes % 60).padStart(2, "0");

  const year = futureDate.getFullYear();
  const month = String(futureDate.getMonth() + 1).padStart(2, "0");
  const day = String(futureDate.getDate()).padStart(2, "0");
  const hour = String(futureDate.getHours()).padStart(2, "0");
  const minute = String(futureDate.getMinutes()).padStart(2, "0");
  const second = String(futureDate.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetSign}${offsetHours}:${offsetMinutes}`;
};

const buildDateFromMinutesAhead = (minutesAhead) =>
  new Date(Date.now() + minutesAhead * 60 * 1000);

const calculateMinutesAhead = (futureTimeValue) => {
  const futureDate = new Date(futureTimeValue);

  if (Number.isNaN(futureDate.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((futureDate.getTime() - Date.now()) / 60000));
};

const decorateRoutes = (apiRoutes) =>
  apiRoutes.map((route) => {
    const durationSeconds = Number(route.travel_time ?? 0);
    const distanceMeters = Number(route.distance ?? 0);
    const confidenceRaw = Number(route.confidence ?? 0);

    return {
      id: `route-${route.route_index}`,
      routeIndex: route.route_index,
      geometry: route.points,
      duration: Math.round(durationSeconds / 60),
      distance: Number((distanceMeters / 1000).toFixed(1)),
      confidence: Number((confidenceRaw * 100).toFixed(0)),
      priority: route.priority,
      color: route.color,
      riskMessage:
        route.priority === "high"
          ? "Lowest delay risk based on the future-time prediction."
          : route.priority === "medium"
            ? "Moderate delay risk. Keep as a backup option."
            : "Highest delay risk among the current route options."
    };
  });

function App() {
  const [source, setSource] = useState("Swargate");
  const [destination, setDestination] = useState("Hinjewadi");
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [sliderTime, setSliderTime] = useState(30);
  const [futureTime, setFutureTime] = useState(() =>
    buildLocalDateTimeValue(buildDateFromMinutesAhead(30))
  );
  const [predictionContext, setPredictionContext] = useState(null);
  const [waitRecommendation, setWaitRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const selectedRoute =
      routes.find((route) => route.id === selectedRouteId) || null;
    setRouteData(selectedRoute);
  }, [routes, selectedRouteId]);

  const handleGetRoute = async () => {
    if (!source.trim() || !destination.trim()) {
      setError("Please enter both source and destination.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!futureTime) {
        throw new Error("Please choose a future prediction time.");
      }

      const futureDate = new Date(futureTime);

      if (Number.isNaN(futureDate.getTime())) {
        throw new Error("Please enter a valid prediction time.");
      }

      const response = await axios.post(`${API_BASE_URL}/predict-route`, {
        origin: source.trim(),
        destination: destination.trim(),
        future_time: buildFutureTimeIso(futureDate)
      });

      const mappedRoutes = decorateRoutes(response.data.routes || []);

      if (mappedRoutes.length === 0) {
        throw new Error("No routes were returned for this trip.");
      }

      const recommendedRoute =
        mappedRoutes.find(
          (route) => route.routeIndex === response.data.best_route_index
        ) || mappedRoutes[0];

      setRoutes(mappedRoutes);
      setPredictionContext(response.data.prediction_context || null);
      setWaitRecommendation(response.data.wait_recommendation || null);
      setSelectedRouteId(recommendedRoute.id);
      setRouteData(recommendedRoute);
      setSourceCoords(recommendedRoute.geometry[0] || null);
      setDestinationCoords(
        recommendedRoute.geometry[recommendedRoute.geometry.length - 1] || null
      );
    } catch (requestError) {
      setSourceCoords(null);
      setDestinationCoords(null);
      setRouteData(null);
      setRoutes([]);
      setPredictionContext(null);
      setWaitRecommendation(null);
      setSelectedRouteId(null);
      setError(
        requestError.response?.data?.detail ||
          requestError.message ||
          "Unable to fetch route prediction."
      );
    } finally {
      setLoading(false);
    }
  };

  const isTokenMissing = MAPBOX_TOKEN === "YOUR_MAPBOX_TOKEN";

  const handleSwapLocations = () => {
    setSource(destination);
    setDestination(source);
  };

  const handleSliderTimeChange = (minutesAhead) => {
    setSliderTime(minutesAhead);
    setFutureTime(buildLocalDateTimeValue(buildDateFromMinutesAhead(minutesAhead)));
  };

  const handleFutureTimeChange = (value) => {
    setFutureTime(value);
    setSliderTime(calculateMinutesAhead(value));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Pune Urban Mobility Command Surface</p>
          <h1 className="page-title">LogiTwin Pune</h1>
          <p className="page-subtitle">
            Predict the best live route for a future dispatch window and compare
            all alternatives side by side.
          </p>
        </div>

        <div className="header-badges">
          <div className="header-badge">
            <span>City Focus</span>
            <strong>Pune, India</strong>
          </div>
          <div className="header-badge">
            <span>Mode</span>
            <strong>Road Logistics</strong>
          </div>
          <div className="header-badge status-badge">
            <span>Prediction API</span>
            <strong>{loading ? "Predicting" : "API ready"}</strong>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <div className="map-column">
          <InputPanel
            source={source}
            destination={destination}
            locationOptions={LOCATION_OPTIONS}
            setSource={setSource}
            setDestination={setDestination}
            onGetRoute={handleGetRoute}
            onSwapLocations={handleSwapLocations}
            futureTime={futureTime}
            onFutureTimeChange={handleFutureTimeChange}
            loading={loading}
            error={error}
          />

          <MapComponent
            mapboxToken={MAPBOX_TOKEN}
            center={PUNE_CENTER}
            routes={routes}
            routeData={routeData}
            selectedRouteId={selectedRouteId}
            sourceCoords={sourceCoords}
            destinationCoords={destinationCoords}
            isTokenMissing={isTokenMissing}
          />

          <div className="slider-panel">
            <div className="slider-header">
              <div className="slider-header-copy">
                <span>Traffic Prediction Window</span>
                <p>
                  Pick how far into the future the model should score the
                  current route options.
                </p>
              </div>
              <div className="slider-header-value">
                <strong>{`Prediction Window: ${formatMinutesAhead(sliderTime)}`}</strong>
                <small>{`Selected Time: ${formatSelectedTime(futureTime)}`}</small>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="10080"
              step="10"
              value={sliderTime}
              onChange={(event) =>
                handleSliderTimeChange(Number(event.target.value))
              }
              className="time-slider"
            />
            <div className="slider-scale">
              <span>Now</span>
              <span>1 day</span>
              <span>3 days</span>
              <span>7 days</span>
            </div>
          </div>
        </div>

        <RouteComparisonPanel
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          waitRecommendation={waitRecommendation}
        />
      </div>
    </div>
  );
}

export default App;
