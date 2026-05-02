import React, { useEffect, useState } from "react";
import axios from "axios";
import InputPanel from "./components/InputPanel";
import MapComponent from "./components/MapComponent";
import RoutePanel from "./components/RoutePanel";

const MAPBOX_TOKEN =
  process.env.REACT_APP_MAPBOX_TOKEN || "YOUR_MAPBOX_TOKEN";
const PUNE_CENTER = [73.8567, 18.5204];

const getRandomCongestion = () => {
  const levels = ["low", "medium", "high"];
  return levels[Math.floor(Math.random() * levels.length)];
};

const chunkRouteGeometry = (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    return [];
  }

  const segments = [];

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    segments.push({
      id: `segment-${index}`,
      coordinates: [coordinates[index], coordinates[index + 1]],
      congestion: getRandomCongestion()
    });
  }

  return segments;
};

const decorateRoutes = (routes) =>
  routes.map((route, index) => ({
    id: `route-${index}`,
    geometry: route.geometry.coordinates,
    duration: route.duration,
    distance: route.distance,
    riskScore: Math.floor(Math.random() * 41) + 55,
    trafficSegments: chunkRouteGeometry(route.geometry.coordinates)
  }));

function App() {
  const [source, setSource] = useState("Shivajinagar, Pune");
  const [destination, setDestination] = useState("Hinjawadi, Pune");
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [timeOffset, setTimeOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (routes.length === 0) {
      return;
    }

    // Re-simulate route traffic whenever the slider changes.
    setRoutes((currentRoutes) =>
      currentRoutes.map((route) => ({
        ...route,
        trafficSegments: route.trafficSegments.map((segment) => ({
          ...segment,
          congestion: getRandomCongestion()
        })),
        riskScore: Math.min(99, Math.floor(Math.random() * 41) + 55)
      }))
    );
  }, [timeOffset]);

  const geocodePlace = async (place) => {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        place
      )}.json`,
      {
        params: {
          access_token: MAPBOX_TOKEN,
          limit: 1,
          autocomplete: true,
          country: "IN",
          proximity: `${PUNE_CENTER[0]},${PUNE_CENTER[1]}`
        }
      }
    );

    const feature = response.data.features?.[0];

    if (!feature) {
      throw new Error(`No coordinates found for "${place}".`);
    }

    return feature.center;
  };

  const handleGetRoute = async () => {
    if (!source.trim() || !destination.trim()) {
      setError("Please enter both source and destination.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [sourceCoords, destinationCoords] = await Promise.all([
        geocodePlace(source),
        geocodePlace(destination)
      ]);

      const directionsResponse = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${sourceCoords.join(
          ","
        )};${destinationCoords.join(",")}`,
        {
          params: {
            access_token: MAPBOX_TOKEN,
            geometries: "geojson",
            alternatives: true,
            overview: "full",
            steps: false
          }
        }
      );

      const mappedRoutes = decorateRoutes(directionsResponse.data.routes || []);

      if (mappedRoutes.length === 0) {
        throw new Error("No routes were returned for this trip.");
      }

      setRoutes(mappedRoutes.slice(0, 3));
      setSelectedRouteId(mappedRoutes[0].id);
    } catch (requestError) {
      setRoutes([]);
      setSelectedRouteId(null);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to fetch route."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) || null;
  const isTokenMissing = MAPBOX_TOKEN === "YOUR_MAPBOX_TOKEN";

  const handleSwapLocations = () => {
    setSource(destination);
    setDestination(source);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Pune Urban Mobility Command Surface</p>
          <h1 className="page-title">LogiTwin Pune</h1>
          <p className="page-subtitle">
            Explore route alternatives, simulate congestion shifts, and compare
            trip risk across the city.
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
            <span>Map Status</span>
            <strong>{isTokenMissing ? "Token pending" : "Live ready"}</strong>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <div className="map-column">
          <InputPanel
            source={source}
            destination={destination}
            setSource={setSource}
            setDestination={setDestination}
            onGetRoute={handleGetRoute}
            onSwapLocations={handleSwapLocations}
            loading={loading}
            error={error}
          />

          <MapComponent
            mapboxToken={MAPBOX_TOKEN}
            center={PUNE_CENTER}
            routes={routes}
            selectedRouteId={selectedRouteId}
            isTokenMissing={isTokenMissing}
          />

          <div className="slider-panel">
            <div className="slider-header">
              <div>
                <span>Traffic Prediction Window</span>
                <p>Move the slider to simulate near-future congestion changes.</p>
              </div>
              <strong>{timeOffset} mins</strong>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={timeOffset}
              onChange={(event) => setTimeOffset(Number(event.target.value))}
              className="time-slider"
            />
            <div className="slider-scale">
              <span>Now</span>
              <span>30m</span>
              <span>60m</span>
              <span>90m</span>
            </div>
          </div>
        </div>

        <RoutePanel
          selectedRoute={selectedRoute}
          routes={routes}
          onSelectRoute={setSelectedRouteId}
          timeOffset={timeOffset}
        />
      </div>
    </div>
  );
}

export default App;
