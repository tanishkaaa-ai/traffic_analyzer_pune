import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const congestionColors = {
  low: "#22c55e",
  medium: "#facc15",
  high: "#ef4444"
};

function MapComponent({
  mapboxToken,
  center,
  routes,
  routeData,
  segments,
  congestionLevels,
  selectedRouteId,
  sourceCoords,
  destinationCoords,
  isTokenMissing
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const vehicleMarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const isMapStyleReady = (mapInstance) =>
    Boolean(mapInstance && !mapInstance._removed && mapInstance.getStyle());

  const removeLayerIfPresent = (mapInstance, layerId) => {
    if (!isMapStyleReady(mapInstance)) {
      return;
    }

    if (mapInstance.getLayer(layerId)) {
      mapInstance.removeLayer(layerId);
    }
  };

  const removeSourceIfPresent = (mapInstance, sourceId) => {
    if (!isMapStyleReady(mapInstance)) {
      return;
    }

    if (mapInstance.getSource(sourceId)) {
      mapInstance.removeSource(sourceId);
    }
  };

  const stopVehicleAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }
  };

  useEffect(() => {
    mapboxgl.accessToken = mapboxToken;

    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 11
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      stopVehicleAnimation();
      markersRef.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return undefined;
    }

    const renderRoutes = () => {
      stopVehicleAnimation();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Draw non-selected routes as lighter comparison lines.
      routes.forEach((route, routeIndex) => {
        const routeSourceId = `${route.id}-source`;
        const baseLayerId = `${route.id}-base-line`;
        const selected = route.id === selectedRouteId;

        removeLayerIfPresent(map, baseLayerId);
        removeSourceIfPresent(map, routeSourceId);

        map.addSource(routeSourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: route.geometry
            },
            properties: {}
          }
        });

        map.addLayer({
          id: baseLayerId,
          type: "line",
          source: routeSourceId,
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": selected ? "#0f172a" : routeIndex === 1 ? "#64748b" : "#94a3b8",
            "line-width": selected ? 3 : 5,
            "line-opacity": selected ? 0.18 : 0.45
          }
        });
      });

      // Remove the previous active route before drawing the newly selected one.
      removeLayerIfPresent(map, "active-route-line");
      removeSourceIfPresent(map, "active-route-source");
      removeLayerIfPresent(map, "traffic-prediction-line");
      removeSourceIfPresent(map, "traffic-prediction-source");

      // Draw the selected route as a dedicated GeoJSON source + line layer.
      if (routeData?.geometry?.length > 1) {
        map.addSource("active-route-source", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routeData.geometry
            },
            properties: {}
          }
        });

        map.addLayer({
          id: "active-route-line",
          type: "line",
          source: "active-route-source",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": "#0f172a",
            "line-width": 8,
            "line-opacity": 0.35
          }
        });
      }

      // Render each segment independently so prediction colors update smoothly.
      const trafficFeatures = segments.map((segment) => ({
        type: "Feature",
        properties: {
          color:
            congestionColors[
              congestionLevels.find((level) => level.segmentId === segment.id)?.level || "low"
            ]
        },
        geometry: {
          type: "LineString",
          coordinates: segment.coordinates
        }
      }));

      if (trafficFeatures.length > 0) {
        map.addSource("traffic-prediction-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: trafficFeatures
          }
        });

        map.addLayer({
          id: "traffic-prediction-line",
          type: "line",
          source: "traffic-prediction-source",
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": ["get", "color"],
            "line-width": 6,
            "line-opacity": 1
          }
        });
      }

      if (sourceCoords && destinationCoords) {
        const startMarker = new mapboxgl.Marker({ color: "#10b981" })
          .setLngLat(sourceCoords)
          .addTo(map);
        const endMarker = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat(destinationCoords)
          .addTo(map);

        markersRef.current.push(startMarker, endMarker);
      }

      if (routeData?.geometry?.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        routeData.geometry.forEach((coordinate) => bounds.extend(coordinate));
        map.fitBounds(bounds, { padding: 70, duration: 800 });
      }

      if (routeData?.geometry?.length > 1) {
        const vehicleElement = document.createElement("div");
        vehicleElement.className = "vehicle-marker";
        vehicleElement.innerHTML =
          '<div class="vehicle-marker__pulse"></div><div class="vehicle-marker__body">Truck</div>';

        vehicleMarkerRef.current = new mapboxgl.Marker({
          element: vehicleElement,
          anchor: "center"
        })
          .setLngLat(routeData.geometry[0])
          .addTo(map);

        const animationDuration = 12000;
        const stepCount = routeData.geometry.length - 1;
        let animationStart = null;

        const animateVehicle = (timestamp) => {
          if (!vehicleMarkerRef.current) {
            return;
          }

          if (!animationStart) {
            animationStart = timestamp;
          }

          const elapsed = (timestamp - animationStart) % animationDuration;
          const progress = elapsed / animationDuration;
          const rawIndex = progress * stepCount;
          const startIndex = Math.floor(rawIndex);
          const endIndex = Math.min(startIndex + 1, stepCount);
          const segmentProgress = rawIndex - startIndex;
          const startCoord = routeData.geometry[startIndex];
          const endCoord = routeData.geometry[endIndex];

          const lng =
            startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress;
          const lat =
            startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress;

          vehicleMarkerRef.current.setLngLat([lng, lat]);
          animationFrameRef.current = requestAnimationFrame(animateVehicle);
        };

        animationFrameRef.current = requestAnimationFrame(animateVehicle);
      }
    };

    if (map.isStyleLoaded()) {
      renderRoutes();
    } else {
      map.once("load", renderRoutes);
    }

    return () => {
      routes.forEach((route) => {
        const routeSourceId = `${route.id}-source`;
        const baseLayerId = `${route.id}-base-line`;

        removeLayerIfPresent(map, baseLayerId);
        removeSourceIfPresent(map, routeSourceId);
      });

      removeLayerIfPresent(map, "traffic-prediction-line");
      removeSourceIfPresent(map, "traffic-prediction-source");
      removeLayerIfPresent(map, "active-route-line");
      removeSourceIfPresent(map, "active-route-source");

      stopVehicleAnimation();
    };
  }, [
    routes,
    routeData,
    segments,
    congestionLevels,
    selectedRouteId,
    sourceCoords,
    destinationCoords
  ]);

  return (
    <div className="map-card">
      <div className="map-toolbar">
        <div className="map-brand">
          <span className="map-kicker">Live Map Surface</span>
          <strong>Pune Traffic Twin</strong>
        </div>
        <div className="map-pills">
          <span className="map-pill">Interactive map</span>
          <span className="map-pill">Alternative routes</span>
        </div>
      </div>

      <div ref={mapContainerRef} className="map-container" />

      {isTokenMissing ? (
        <div className="map-overlay">
          <div className="map-overlay-card">
            <p>Mapbox token needed</p>
            <h3>UI is ready for live routing</h3>
            <span>
              Add your Mapbox public token in <code>src/App.js</code> to unlock
              the interactive Pune map and route rendering.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MapComponent;
