import csv
import os
import random
import time
from datetime import date, datetime, timedelta

import requests

MY_ORIGINS = ["Swargate"]

BASE_URL = "https://api.tomtom.com/routing/1/calculateRoute/{start}:{end}/json"
BASE_DATE = date(2026, 4, 1)
HOURS = [0, 6, 8, 10, 12, 14, 16, 18, 20, 22]
WEEK_OFFSETS = [0, 7, 14]
MAX_RETRIES = 3

LOCATIONS = {
    "Swargate": (18.5018, 73.8620),
    "Hinjewadi": (18.5912, 73.7389),
    "Kothrud": (18.5074, 73.8077),
    "Hadapsar": (18.5089, 73.9260),
    "University": (18.5520, 73.8250),
}

COLUMNS = [
    "origin",
    "destination",
    "hour",
    "day_of_week",
    "route_id",
    "travel_time",
    "distance",
    "traffic_delay",
    "avg_speed",
    "delay_ratio",
    "is_best_route",
]


def get_api_key():
    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        raise RuntimeError("Missing TOMTOM_API_KEY environment variable.")
    return api_key


def build_pairs():
    pairs = []
    for origin in MY_ORIGINS:
        for destination in LOCATIONS:
            if origin == destination:
                continue
            pairs.append((origin, destination))
    return pairs


def build_departure_datetime(day_of_week, week_offset, hour):
    base_with_offset = BASE_DATE + timedelta(days=week_offset)
    day_shift = (day_of_week - base_with_offset.weekday()) % 7
    target_date = base_with_offset + timedelta(days=day_shift)
    return datetime.combine(target_date, datetime.min.time()).replace(hour=hour)


def call_routing_api(api_key, start, end, depart_at):
    url = BASE_URL.format(start=start, end=end)
    params = {
        "key": api_key,
        "departAt": depart_at,
        "traffic": "true",
        "computeTravelTimeFor": "all",
        "maxAlternatives": 2,
        "travelMode": "car",
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            print(
                f"[retry {attempt}/{MAX_RETRIES}] API call failed for {start} -> {end} at {depart_at}: {exc}"
            )
            if attempt == MAX_RETRIES:
                return None
            time.sleep(1.0)

    return None


def summary_to_row(origin, destination, hour, day_of_week, route_id, summary):
    travel_time = summary.get("travelTimeInSeconds", 0)
    distance = summary.get("lengthInMeters", 0)
    traffic_delay = summary.get("trafficDelayInSeconds", 0)

    avg_speed = 0.0
    delay_ratio = 0.0

    if travel_time > 0:
        avg_speed = (distance / 1000) / (travel_time / 3600)
        delay_ratio = traffic_delay / travel_time

    return {
        "origin": origin,
        "destination": destination,
        "hour": hour,
        "day_of_week": day_of_week,
        "route_id": route_id,
        "travel_time": travel_time,
        "distance": distance,
        "traffic_delay": traffic_delay,
        "avg_speed": round(avg_speed, 4),
        "delay_ratio": round(delay_ratio, 4),
        "is_best_route": 0,
    }


def mark_best_routes(rows):
    if not rows:
        return rows

    best_time = min(row["travel_time"] for row in rows)
    for row in rows:
        row["is_best_route"] = 1 if row["travel_time"] == best_time else 0
    return rows


def generate_dataset_for_origin(origin, api_key):
    dataset_rows = []
    origin_coords = LOCATIONS[origin]
    origin_str = f"{origin_coords[0]},{origin_coords[1]}"
    destination_names = [name for name in LOCATIONS if name != origin]

    total_jobs = len(destination_names) * len(WEEK_OFFSETS) * 7 * len(HOURS)
    processed_jobs = 0

    for destination in destination_names:
        destination_coords = LOCATIONS[destination]
        destination_str = f"{destination_coords[0]},{destination_coords[1]}"

        for week_offset in WEEK_OFFSETS:
            for day_of_week in range(7):
                for hour in HOURS:
                    depart_dt = build_departure_datetime(day_of_week, week_offset, hour)
                    depart_at = depart_dt.strftime("%Y-%m-%dT%H:%M:%S")

                    processed_jobs += 1
                    print(
                        f"[{processed_jobs}/{total_jobs}] {origin} -> {destination} | day={day_of_week} week_offset={week_offset} hour={hour}"
                    )

                    payload = call_routing_api(
                        api_key, origin_str, destination_str, depart_at
                    )
                    time.sleep(random.uniform(0.5, 1.0))

                    if not payload:
                        continue

                    route_rows = []
                    for route_index, route in enumerate(payload.get("routes", []), start=1):
                        summary = route.get("summary", {})
                        route_rows.append(
                            summary_to_row(
                                origin,
                                destination,
                                hour,
                                day_of_week,
                                route_index,
                                summary,
                            )
                        )

                    dataset_rows.extend(mark_best_routes(route_rows))

    return dataset_rows


def save_dataset(origin, rows):
    output_path = os.path.join(
        os.path.dirname(__file__), f"dataset_{origin.lower()}.csv"
    )
    with open(output_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved {len(rows)} rows to {output_path}")


def main():
    api_key = get_api_key()

    for origin in MY_ORIGINS:
        if origin not in LOCATIONS:
            print(f"Skipping unknown origin: {origin}")
            continue

        print(f"Generating dataset for origin: {origin}")
        rows = generate_dataset_for_origin(origin, api_key)
        save_dataset(origin, rows)


if __name__ == "__main__":
    main()
