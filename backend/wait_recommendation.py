from __future__ import annotations

from datetime import timedelta
from typing import Any

try:
    from .predict_best_route import parse_future_time, predict_best_route
except ImportError:
    from predict_best_route import parse_future_time, predict_best_route


WAIT_OFFSETS_MINUTES = [10, 15, 20, 30]
MINIMUM_TIME_SAVED_MINUTES = 5.0


def extract_best_route_travel_time(prediction: dict[str, Any]) -> float:
    """Read the predicted travel time for the currently selected best route."""
    best_route_index = int(prediction["best_route_index"])
    frontend_routes = prediction.get("frontend_routes", [])

    if 0 <= best_route_index < len(frontend_routes):
        return float(frontend_routes[best_route_index]["travel_time"])

    raise ValueError("Prediction result is missing the best route travel time")


def build_wait_recommendation(
    current_travel_time_seconds: float,
    best_offset_minutes: int,
    best_future_travel_time_seconds: float,
) -> dict[str, Any]:
    """Create the non-intrusive wait suggestion payload."""
    time_saved_minutes = round(
        (current_travel_time_seconds - best_future_travel_time_seconds) / 60.0,
        1,
    )
    should_wait = (
        time_saved_minutes >= MINIMUM_TIME_SAVED_MINUTES
        and best_offset_minutes <= max(WAIT_OFFSETS_MINUTES)
    )

    if should_wait:
        message = (
            f"Wait {best_offset_minutes} mins to save ~{time_saved_minutes} mins"
        )
        action = "WAIT"
    elif time_saved_minutes > 0:
        message = (
            f"Leave now. Waiting {best_offset_minutes} mins only saves "
            f"~{time_saved_minutes} mins."
        )
        action = "LEAVE_NOW"
    elif time_saved_minutes < 0:
        message = (
            f"Leave now. Waiting {best_offset_minutes} mins may add "
            f"~{abs(time_saved_minutes)} mins."
        )
        action = "LEAVE_NOW"
    else:
        message = "Leave now. Waiting is not expected to improve travel time."
        action = "LEAVE_NOW"

    return {
        "action": action,
        "wait_minutes": best_offset_minutes,
        "time_saved": time_saved_minutes,
        "message": message,
    }


def predict_best_route_with_wait_recommendation(
    origin: str,
    destination: str,
    future_time: str,
    api_key: str | None = None,
) -> dict[str, Any]:
    """
    Run the existing prediction first, then append a separate wait suggestion
    based on the same route predictor evaluated at nearby future offsets.
    """
    current_result = predict_best_route(
        origin=origin,
        destination=destination,
        future_time=future_time,
        api_key=api_key,
    )
    current_travel_time_seconds = extract_best_route_travel_time(current_result)
    current_dt = parse_future_time(future_time)

    best_offset_minutes = WAIT_OFFSETS_MINUTES[0]
    best_future_travel_time_seconds = current_travel_time_seconds
    best_time_saved_minutes = float("-inf")

    for offset_minutes in WAIT_OFFSETS_MINUTES:
        offset_result = predict_best_route(
            origin=origin,
            destination=destination,
            future_time=current_dt + timedelta(minutes=offset_minutes),
            api_key=api_key,
        )
        future_travel_time_seconds = extract_best_route_travel_time(offset_result)
        time_saved_minutes = (
            current_travel_time_seconds - future_travel_time_seconds
        ) / 60.0

        if (
            time_saved_minutes > best_time_saved_minutes
            or (
                time_saved_minutes == best_time_saved_minutes
                and offset_minutes < best_offset_minutes
            )
        ):
            best_time_saved_minutes = time_saved_minutes
            best_offset_minutes = offset_minutes
            best_future_travel_time_seconds = future_travel_time_seconds

    response = dict(current_result)
    response["wait_recommendation"] = build_wait_recommendation(
        current_travel_time_seconds=current_travel_time_seconds,
        best_offset_minutes=best_offset_minutes,
        best_future_travel_time_seconds=best_future_travel_time_seconds,
    )
    return response
