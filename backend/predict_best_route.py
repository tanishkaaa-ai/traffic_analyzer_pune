from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import requests


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "route_model.pkl"
TOMTOM_ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute/{start}:{end}/json"

place_mapping = {
    "Swargate": 0,
    "Hinjewadi": 1,
    "Kothrud": 2,
    "Hadapsar": 3,
    "University": 4,
}

# These coordinates keep the API input aligned with your existing named places.
place_coordinates = {
    "Swargate": (18.5018, 73.8620),
    "Hinjewadi": (18.5912, 73.7389),
    "Kothrud": (18.5074, 73.8077),
    "Hadapsar": (18.5089, 73.9260),
    "University": (18.5531, 73.8246),
}

FEATURE_COLUMNS = [
    "origin",
    "destination",
    "hour",
    "day_of_week",
    "travel_time",
    "distance",
    "traffic_delay",
    "avg_speed",
    "delay_ratio",
]


def load_model(model_path: Path = MODEL_PATH) -> Any:
    """Load the trained route ranking model from disk."""
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")
    return joblib.load(model_path)


def parse_future_time(future_time: str | datetime) -> datetime:
    """Accept either a datetime object or an ISO-formatted string."""
    if isinstance(future_time, datetime):
        return future_time

    if isinstance(future_time, str):
        normalized = future_time.strip()
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"
        return datetime.fromisoformat(normalized)

    raise TypeError("future_time must be an ISO string or datetime object")


def validate_places(origin: str, destination: str) -> None:
    """Ensure both places are supported by the model's encoding scheme."""
    unsupported = [place for place in (origin, destination) if place not in place_mapping]
    if unsupported:
        supported = ", ".join(place_mapping.keys())
        invalid = ", ".join(unsupported)
        raise ValueError(f"Unsupported place(s): {invalid}. Supported places: {supported}")


def build_current_departure_time() -> str:
    """Use the current time for the routing API request, never the future model time."""
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def fetch_current_routes(origin: str, destination: str, api_key: str) -> list[dict[str, Any]]:
    """Fetch currently available route alternatives from TomTom."""
    start_lat, start_lng = place_coordinates[origin]
    end_lat, end_lng = place_coordinates[destination]

    url = TOMTOM_ROUTING_URL.format(
        start=f"{start_lat},{start_lng}",
        end=f"{end_lat},{end_lng}",
    )
    params = {
        "key": api_key,
        "departAt": build_current_departure_time(),
        "traffic": "true",
        "maxAlternatives": 2,
        "computeTravelTimeFor": "all",
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    routes = response.json().get("routes", [])
    if not routes:
        raise ValueError("TomTom returned no routes for the given origin and destination")

    return routes


def extract_route_features(
    routes: list[dict[str, Any]],
    origin_encoded: int,
    destination_encoded: int,
    future_hour: int,
    future_day: int,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """Convert TomTom route summaries into the exact feature layout used by training."""
    feature_rows: list[list[float | int]] = []
    route_summaries: list[dict[str, Any]] = []

    for route in routes:
        summary = route.get("summary", {})
        travel_time = float(summary.get("travelTimeInSeconds", 0))
        distance = float(summary.get("lengthInMeters", 0))
        traffic_delay = float(summary.get("trafficDelayInSeconds", 0))

        if travel_time <= 0 or distance <= 0:
            raise ValueError("TomTom route summary is missing valid travel time or distance")

        avg_speed = (distance / 1000.0) / (travel_time / 3600.0)
        delay_ratio = traffic_delay / travel_time if travel_time else 0.0

        feature_rows.append(
            [
                origin_encoded,
                destination_encoded,
                future_hour,
                future_day,
                travel_time,
                distance,
                traffic_delay,
                avg_speed,
                delay_ratio,
            ]
        )

        route_summaries.append(
            {
                "travel_time": travel_time,
                "distance": distance,
                "traffic_delay": traffic_delay,
                "avg_speed": avg_speed,
                "delay_ratio": delay_ratio,
            }
        )

    feature_frame = pd.DataFrame(feature_rows, columns=FEATURE_COLUMNS)
    return feature_frame, route_summaries


def predict_best_route(
    origin: str,
    destination: str,
    future_time: str | datetime,
    api_key: str | None = None,
) -> dict[str, Any]:
    """
    Use current TomTom route alternatives and future-time model features
    to predict which current route is most likely to be the best.
    """
    validate_places(origin, destination)

    resolved_api_key = api_key or os.getenv("TOMTOM_API_KEY")
    if not resolved_api_key:
        raise ValueError("Missing TomTom API key. Set TOMTOM_API_KEY or pass api_key explicitly.")

    future_dt = parse_future_time(future_time)
    future_hour = future_dt.hour
    future_day = future_dt.weekday()

    origin_encoded = place_mapping[origin]
    destination_encoded = place_mapping[destination]

    routes = fetch_current_routes(origin, destination, resolved_api_key)
    model = load_model()
    feature_frame, route_summaries = extract_route_features(
        routes=routes,
        origin_encoded=origin_encoded,
        destination_encoded=destination_encoded,
        future_hour=future_hour,
        future_day=future_day,
    )

    probabilities = model.predict_proba(feature_frame)
    confidence_scores = probabilities[:, 1]
    best_index = int(np.argmax(confidence_scores))

    return {
        "origin": origin,
        "destination": destination,
        "future_time": future_dt.isoformat(),
        "best_route_index": best_index,
        "confidence_scores": confidence_scores.tolist(),
        "routes": routes,
        "route_features": route_summaries,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Predict the best current TomTom route for a user-provided future time."
    )
    parser.add_argument("origin", help="Origin place name, for example Swargate")
    parser.add_argument("destination", help="Destination place name, for example Hinjewadi")
    parser.add_argument(
        "future_time",
        help="Future time as ISO string, for example 2026-05-02T18:30:00+05:30",
    )
    args = parser.parse_args()

    result = predict_best_route(
        origin=args.origin,
        destination=args.destination,
        future_time=args.future_time,
    )
    print(json.dumps(result, indent=2))
