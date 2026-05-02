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

// Split the route geometry into smaller chunks so each segment can carry
// its own prediction color and risk contribution.
const chunkRouteGeometry = (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    return [];
  }

  const segments = [];
  const stepSize = Math.max(3, Math.floor(coordinates.length / 28));

  for (let index = 0; index < coordinates.length - 1; index += stepSize) {
    const nextIndex = Math.min(index + stepSize, coordinates.length - 1);

    segments.push({
      id: `segment-${index}`,
      coordinates: [coordinates[index], coordinates[nextIndex]]
    });
  }

  return segments;
};

const createCongestionLevels = (routeSegments) =>
  routeSegments.map((segment) => ({
    segmentId: segment.id,
    level: getRandomCongestion()
  }));

const buildTrafficSegments = (routeSegments, levels) =>
  routeSegments.map((segment) => ({
    ...segment,
    congestion:
      levels.find((level) => level.segmentId === segment.id)?.level || "low"
  }));

// Risk is tied to the number of red segments, with a small random drift so it
// still feels like a prediction score rather than a fixed calculation.
const calculateRiskScore = (levels) => {
  if (levels.length === 0) {
    return 0;
  }

  const redSegments = levels.filter((level) => level.level === "high").length;
  const baseScore = (redSegments / levels.length) * 80;
  const randomDrift = Math.floor(Math.random() * 20);

  return Math.min(99, Math.round(baseScore + randomDrift));
};

const decorateRoutes = (routes) =>
  routes.map((route, index) => {
    const segments = chunkRouteGeometry(route.geometry.coordinates);
    const congestionLevels = createCongestionLevels(segments);

    return {
      id: `route-${index}`,
      geometry: route.geometry.coordinates,
      duration: route.duration,
      distance: route.distance,
      segments,
      congestionLevels,
      trafficSegments: buildTrafficSegments(segments, congestionLevels),
      riskScore: calculateRiskScore(congestionLevels)
    };
  });

function App() {
  const [source, setSource] = useState("Shivajinagar, Pune");
  const [destination, setDestination] = useState("Hinjawadi, Pune");
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [segments, setSegments] = useState([]);
  const [congestionLevels, setCongestionLevels] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [sliderTime, setSliderTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Recalculate congestion colors when the time slider changes.
  useEffect(() => {
    if (routes.length === 0) {
      return;
    }

    setRoutes((currentRoutes) =>
      currentRoutes.map((route) => {
        const nextCongestionLevels = createCongestionLevels(route.segments);

        return {
          ...route,
          congestionLevels: nextCongestionLevels,
          trafficSegments: buildTrafficSegments(route.segments, nextCongestionLevels),
          riskScore: calculateRiskScore(nextCongestionLevels)
        };
      })
    );
  }, [sliderTime]);

  // Keep the selected route's derived route state synchronized.
  useEffect(() => {
    const selectedRoute =
      routes.find((route) => route.id === selectedRouteId) || null;

    setRouteData(selectedRoute);
    setSegments(selectedRoute?.segments || []);
    setCongestionLevels(selectedRoute?.congestionLevels || []);
  }, [routes, selectedRouteId]);

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
      // Geocode both user-entered places and store their coordinates in state.
      const [resolvedSourceCoords, resolvedDestinationCoords] = await Promise.all([
        geocodePlace(source),
        geocodePlace(destination)
      ]);

      setSourceCoords(resolvedSourceCoords);
      setDestinationCoords(resolvedDestinationCoords);

      // Fetch route geometry, distance, and duration from the Directions API.
      const directionsResponse = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${resolvedSourceCoords.join(
          ","
        )};${resolvedDestinationCoords.join(",")}`,
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

      const nextRoutes = mappedRoutes.slice(0, 3);
      const primaryRoute = nextRoutes[0];

      setRoutes(nextRoutes);
      setSelectedRouteId(primaryRoute.id);
      setRouteData(primaryRoute);
      setSegments(primaryRoute.segments);
      setCongestionLevels(primaryRoute.congestionLevels);
    } catch (requestError) {
      setSourceCoords(null);
      setDestinationCoords(null);
      setRouteData(null);
      setSegments([]);
      setCongestionLevels([]);
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
            routeData={routeData}
            segments={segments}
            congestionLevels={congestionLevels}
            selectedRouteId={selectedRouteId}
            sourceCoords={sourceCoords}
            destinationCoords={destinationCoords}
            isTokenMissing={isTokenMissing}
          />

          <div className="slider-panel">
            <div className="slider-header">
              <div>
                <span>Traffic Prediction Window</span>
                <p>Move the slider to simulate near-future congestion changes.</p>
              </div>
              <strong>{sliderTime} mins</strong>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={sliderTime}
              onChange={(event) => setSliderTime(Number(event.target.value))}
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
          selectedRoute={routeData}
          routes={routes}
          onSelectRoute={setSelectedRouteId}
          sliderTime={sliderTime}
        />
      </div>
    </div>
  );
}

export default App;
