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
  selectedRouteId,
  isTokenMissing
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const vehicleMarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

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

      routes.forEach((route, routeIndex) => {
        const routeSourceId = `${route.id}-source`;
        const baseLayerId = `${route.id}-base-line`;
        const trafficSourceId = `${route.id}-traffic-source`;
        const trafficLayerId = `${route.id}-traffic-line`;
        const selected = route.id === selectedRouteId;

        const routeGeoJson = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.geometry
          },
          properties: {}
        };

        if (map.getLayer(baseLayerId)) {
          map.removeLayer(baseLayerId);
        }
        if (map.getSource(routeSourceId)) {
          map.removeSource(routeSourceId);
        }

        map.addSource(routeSourceId, {
          type: "geojson",
          data: routeGeoJson
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
            "line-width": selected ? 8 : 5,
            "line-opacity": selected ? 0.85 : 0.45
          }
        });

        const trafficFeatures = route.trafficSegments.map((segment) => ({
          type: "Feature",
          properties: {
            color: congestionColors[segment.congestion]
          },
          geometry: {
            type: "LineString",
            coordinates: segment.coordinates
          }
        }));

        if (map.getLayer(trafficLayerId)) {
          map.removeLayer(trafficLayerId);
        }
        if (map.getSource(trafficSourceId)) {
          map.removeSource(trafficSourceId);
        }

        map.addSource(trafficSourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: trafficFeatures
          }
        });

        map.addLayer({
          id: trafficLayerId,
          type: "line",
          source: trafficSourceId,
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": ["get", "color"],
            "line-width": selected ? 6 : 4,
            "line-opacity": selected ? 1 : 0.85
          }
        });

        if (selected && route.geometry.length > 1) {
          const startMarker = new mapboxgl.Marker({ color: "#10b981" })
            .setLngLat(route.geometry[0])
            .addTo(map);
          const endMarker = new mapboxgl.Marker({ color: "#ef4444" })
            .setLngLat(route.geometry[route.geometry.length - 1])
            .addTo(map);

          markersRef.current.push(startMarker, endMarker);
        }
      });

      if (routes.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        routes.forEach((route) => {
          route.geometry.forEach((coordinate) => bounds.extend(coordinate));
        });
        map.fitBounds(bounds, { padding: 70, duration: 800 });
      }

      const selectedRoute = routes.find((route) => route.id === selectedRouteId);

      if (selectedRoute?.geometry?.length > 1) {
        const vehicleElement = document.createElement("div");
        vehicleElement.className = "vehicle-marker";
        vehicleElement.innerHTML = '<div class="vehicle-marker__pulse"></div><div class="vehicle-marker__body">Truck</div>';

        vehicleMarkerRef.current = new mapboxgl.Marker({
          element: vehicleElement,
          anchor: "center"
        })
          .setLngLat(selectedRoute.geometry[0])
          .addTo(map);

        const animationDuration = 12000;
        const stepCount = selectedRoute.geometry.length - 1;
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

          const startCoord = selectedRoute.geometry[startIndex];
          const endCoord = selectedRoute.geometry[endIndex];

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
        const trafficSourceId = `${route.id}-traffic-source`;
        const trafficLayerId = `${route.id}-traffic-line`;

        if (map.getLayer(trafficLayerId)) {
          map.removeLayer(trafficLayerId);
        }
        if (map.getSource(trafficSourceId)) {
          map.removeSource(trafficSourceId);
        }
        if (map.getLayer(baseLayerId)) {
          map.removeLayer(baseLayerId);
        }
        if (map.getSource(routeSourceId)) {
          map.removeSource(routeSourceId);
        }
      });

      stopVehicleAnimation();
    };
  }, [routes, selectedRouteId]);

  return (
    <div className="map-card">
      <div className="map-toolbar">
        <div>
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
