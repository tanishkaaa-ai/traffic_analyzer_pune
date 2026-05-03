from __future__ import annotations

from datetime import timedelta
from typing import Any

try:
    from .predict_best_route import parse_future_time, predict_best_route
except ImportError:
    from predict_best_route import parse_future_time, predict_best_route


WAIT_OFFSETS_MINUTES = [10, 15, 20, 30]
MINIMUM_TIME_SAVED_MINUTES = 5.0
TREND_STABILITY_THRESHOLD_MINUTES = 2.0


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
    trend_points: list[dict[str, float | int | str]],
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

    current_travel_time_minutes = round(current_travel_time_seconds / 60.0, 1)
    best_future_travel_time_minutes = round(best_future_travel_time_seconds / 60.0, 1)
    trend_direction = classify_trend_direction(
        current_travel_time_minutes=current_travel_time_minutes,
        best_future_travel_time_minutes=best_future_travel_time_minutes,
    )
    insight = build_trend_insight(
        action=action,
        trend_direction=trend_direction,
        best_offset_minutes=best_offset_minutes,
        time_saved_minutes=time_saved_minutes,
    )

    return {
        "action": action,
        "wait_minutes": best_offset_minutes,
        "time_saved": time_saved_minutes,
        "message": message,
        "current_travel_time": current_travel_time_minutes,
        "best_future_travel_time": best_future_travel_time_minutes,
        "trend_direction": trend_direction,
        "trend_points": trend_points,
        "insight": insight,
    }


def classify_trend_direction(
    current_travel_time_minutes: float,
    best_future_travel_time_minutes: float,
) -> str:
    """Describe whether waiting seems to improve, worsen, or preserve travel time."""
    time_delta = current_travel_time_minutes - best_future_travel_time_minutes

    if time_delta >= TREND_STABILITY_THRESHOLD_MINUTES:
        return "improving"

    if time_delta <= -TREND_STABILITY_THRESHOLD_MINUTES:
        return "worsening"

    return "stable"


def build_trend_insight(
    action: str,
    trend_direction: str,
    best_offset_minutes: int,
    time_saved_minutes: float,
) -> str:
    """Summarize the trend in a single sentence for the UI."""
    if action == "WAIT":
        if best_offset_minutes <= 15:
            return "Traffic congestion is expected to decrease shortly."

        return "Peak traffic window detected - a short delay is likely to help."

    if trend_direction == "worsening":
        return "Traffic is expected to build up, so leaving now is safer."

    if trend_direction == "improving" and time_saved_minutes > 0:
        return "Traffic may improve slightly, but waiting does not save enough time."

    return "Stable traffic - no meaningful benefit in waiting."


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
    trend_points: list[dict[str, float | int | str]] = [
        {
            "label": "Now",
            "offset_minutes": 0,
            "travel_time": round(current_travel_time_seconds / 60.0, 1),
        }
    ]

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
        trend_points.append(
            {
                "label": f"+{offset_minutes} min",
                "offset_minutes": offset_minutes,
                "travel_time": round(future_travel_time_seconds / 60.0, 1),
            }
        )

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
        trend_points=trend_points,
    )
    return response
