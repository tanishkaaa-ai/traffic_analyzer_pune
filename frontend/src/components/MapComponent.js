import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

function MapComponent({
  mapboxToken,
  center,
  routes,
  routeData,
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
    if (isMapStyleReady(mapInstance) && mapInstance.getLayer(layerId)) {
      mapInstance.removeLayer(layerId);
    }
  };

  const removeSourceIfPresent = (mapInstance, sourceId) => {
    if (isMapStyleReady(mapInstance) && mapInstance.getSource(sourceId)) {
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

      routes.forEach((route) => {
        const routeSourceId = `${route.id}-source`;
        const routeLayerId = `${route.id}-line`;
        const selected = route.id === selectedRouteId;

        removeLayerIfPresent(map, routeLayerId);
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
          id: routeLayerId,
          type: "line",
          source: routeSourceId,
          layout: {
            "line-cap": "round",
            "line-join": "round"
          },
          paint: {
            "line-color": route.color,
            "line-width": selected ? 8 : 5,
            "line-opacity": selected ? 0.95 : 0.6
          }
        });
      });

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

      if (routeData?.priority === "high" && routeData.geometry.length > 1) {
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
        removeLayerIfPresent(map, `${route.id}-line`);
        removeSourceIfPresent(map, `${route.id}-source`);
      });
      stopVehicleAnimation();
    };
  }, [routes, routeData, selectedRouteId, sourceCoords, destinationCoords]);

  return (
    <div className="map-card">
      <div className="map-toolbar">
        <div className="map-brand">
          <span className="map-kicker">Prediction Surface</span>
          <strong>Current Routes, Future Ranking</strong>
        </div>
        <div className="map-pills">
          <span className="map-pill">Backend-ranked routes</span>
          <span className="map-pill">Courier animation</span>
        </div>
      </div>

      <div ref={mapContainerRef} className="map-container" />

      {isTokenMissing ? (
        <div className="map-overlay">
          <div className="map-overlay-card">
            <p>Mapbox token needed</p>
            <h3>Backend integration is ready</h3>
            <span>
              Add your Mapbox public token in <code>frontend/.env</code> to
              unlock the live route rendering experience.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MapComponent;
