from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import requests


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "route_model.pkl"
ENV_PATH = BASE_DIR / ".env"
DATASET_PATH = BASE_DIR / "final_dataset.csv"
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

ESTIMATE_COLUMNS = [
    "travel_time",
    "distance",
    "traffic_delay",
    "avg_speed",
    "delay_ratio",
]

PRIORITY_STYLES = [
    ("high", "green"),
    ("medium", "orange"),
    ("low", "red"),
]


def load_env_file(env_path: Path = ENV_PATH) -> None:
    """Load simple KEY=VALUE pairs from backend/.env into the process environment."""
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def load_model(model_path: Path = MODEL_PATH) -> Any:
    """Load the trained route ranking model from disk."""
    import joblib

    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")
    return joblib.load(model_path)


def load_historical_dataset(dataset_path: Path = DATASET_PATH) -> pd.DataFrame:
    """Load the generated Pune route dataset used for future-time estimates."""
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {dataset_path}")
    return pd.read_csv(dataset_path)


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


def hour_distance(candidate_hour: int, target_hour: int) -> int:
    """Return circular distance between two 24-hour clock values."""
    raw_distance = abs(candidate_hour - target_hour)
    return min(raw_distance, 24 - raw_distance)


def get_future_route_estimates(
    origin: str,
    destination: str,
    future_hour: int,
    future_day: int,
) -> dict[int, dict[str, float]]:
    """
    Pick the closest generated dataset row for each route at the selected future time.

    The routing API provides geometry and currently available alternatives. This dataset
    provides the future-time travel metrics that should change when the user changes day/time.
    """
    dataset = load_historical_dataset()
    place_rows = dataset[
        (dataset["origin"] == origin)
        & (dataset["destination"] == destination)
        & (dataset["day_of_week"] == future_day)
    ]

    if place_rows.empty:
        place_rows = dataset[
            (dataset["origin"] == origin) & (dataset["destination"] == destination)
        ]

    if place_rows.empty:
        return {}

    grouped = (
        place_rows.groupby(["route_id", "hour"], as_index=False)[ESTIMATE_COLUMNS]
        .mean()
        .sort_values(["route_id", "hour"])
    )

    estimates: dict[int, dict[str, float]] = {}
    for route_id, route_rows in grouped.groupby("route_id"):
        route_rows = route_rows.copy()
        route_rows["hour_distance"] = route_rows["hour"].apply(
            lambda candidate_hour: hour_distance(int(candidate_hour), future_hour)
        )
        nearest_row = route_rows.sort_values("hour_distance").iloc[0]
        estimates[int(route_id)] = {
            column: float(nearest_row[column]) for column in ESTIMATE_COLUMNS
        }

    return estimates


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
    future_estimates: dict[int, dict[str, float]] | None = None,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """Convert TomTom route summaries into the exact feature layout used by training."""
    feature_rows: list[list[float | int]] = []
    route_summaries: list[dict[str, Any]] = []

    for route_index, route in enumerate(routes):
        summary = route.get("summary", {})
        travel_time = float(summary.get("travelTimeInSeconds", 0))
        distance = float(summary.get("lengthInMeters", 0))
        traffic_delay = float(summary.get("trafficDelayInSeconds", 0))

        if travel_time <= 0 or distance <= 0:
            raise ValueError("TomTom route summary is missing valid travel time or distance")

        avg_speed = (distance / 1000.0) / (travel_time / 3600.0)
        delay_ratio = traffic_delay / travel_time if travel_time else 0.0
        estimate = (future_estimates or {}).get(route_index)

        if estimate:
            travel_time = estimate["travel_time"]
            distance = estimate["distance"]
            traffic_delay = estimate["traffic_delay"]
            avg_speed = estimate["avg_speed"]
            delay_ratio = estimate["delay_ratio"]

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


def extract_route_points(route: dict[str, Any]) -> list[list[float]]:
    """Convert TomTom leg points into [lng, lat] coordinate pairs for the map."""
    points = route.get("legs", [{}])[0].get("points", [])
    return [[point["longitude"], point["latitude"]] for point in points]


def rank_route_styles(confidence_scores: np.ndarray) -> dict[int, tuple[str, str]]:
    """Assign priority and display color based on descending route confidence."""
    ranked_indices = np.argsort(confidence_scores)[::-1]
    style_map: dict[int, tuple[str, str]] = {}

    for rank, route_index in enumerate(ranked_indices):
        priority, color = PRIORITY_STYLES[min(rank, len(PRIORITY_STYLES) - 1)]
        style_map[int(route_index)] = (priority, color)

    return style_map


def build_frontend_routes(
    routes: list[dict[str, Any]],
    confidence_scores: np.ndarray,
    future_estimates: dict[int, dict[str, float]] | None = None,
) -> list[dict[str, Any]]:
    """Shape TomTom routes into a frontend-friendly payload."""
    style_map = rank_route_styles(confidence_scores)
    frontend_routes: list[dict[str, Any]] = []

    for route_index, route in enumerate(routes):
        summary = route.get("summary", {})
        priority, color = style_map[route_index]
        points = extract_route_points(route)
        estimate = (future_estimates or {}).get(route_index, {})
        current_travel_time = float(summary.get("travelTimeInSeconds", 0))
        current_distance = float(summary.get("lengthInMeters", 0))

        frontend_routes.append(
            {
                "route_index": route_index,
                "confidence": float(confidence_scores[route_index]),
                "priority": priority,
                "color": color,
                "travel_time": float(estimate.get("travel_time", current_travel_time)),
                "distance": float(estimate.get("distance", current_distance)),
                "traffic_delay": float(
                    estimate.get("traffic_delay", summary.get("trafficDelayInSeconds", 0))
                ),
                "current_travel_time": current_travel_time,
                "current_distance": current_distance,
                "points": points,
            }
        )

    return frontend_routes


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
    load_env_file()
    validate_places(origin, destination)

    resolved_api_key = api_key or os.getenv("TOMTOM_API_KEY")
    if not resolved_api_key:
        raise ValueError("Missing TomTom API key. Set TOMTOM_API_KEY or pass api_key explicitly.")

    future_dt = parse_future_time(future_time)
    future_hour = future_dt.hour
    future_day = future_dt.weekday()

    origin_encoded = place_mapping[origin]
    destination_encoded = place_mapping[destination]
    future_estimates = get_future_route_estimates(
        origin=origin,
        destination=destination,
        future_hour=future_hour,
        future_day=future_day,
    )

    routes = fetch_current_routes(origin, destination, resolved_api_key)
    model = load_model()
    feature_frame, route_summaries = extract_route_features(
        routes=routes,
        origin_encoded=origin_encoded,
        destination_encoded=destination_encoded,
        future_hour=future_hour,
        future_day=future_day,
        future_estimates=future_estimates,
    )

    probabilities = model.predict_proba(feature_frame)
    confidence_scores = probabilities[:, 1]
    best_index = int(np.argmax(confidence_scores))
    frontend_routes = build_frontend_routes(routes, confidence_scores, future_estimates)

    return {
        "origin": origin,
        "destination": destination,
        "future_time": future_dt.isoformat(),
        "prediction_context": {
            "future_time": future_dt.isoformat(),
            "future_hour": future_hour,
            "future_day": future_day,
            "uses_future_estimates": bool(future_estimates),
        },
        "best_route_index": best_index,
        "confidence_scores": confidence_scores.tolist(),
        "frontend_routes": frontend_routes,
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
