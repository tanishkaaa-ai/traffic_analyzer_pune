import requests
import pandas as pd
from datetime import datetime, timedelta
import time

# =========================
# CONFIG (CHANGE PER LAPTOP)
# =========================
API_KEY = "YOUR_API_KEY"

MY_ORIGIN = "Hinjewadi"   # 👈 CHANGE per laptop

# =========================
# LOCATIONS
# =========================
locations = {
    "Swargate": (18.5018, 73.8620),
    "Hinjewadi": (18.5912, 73.7389),
    "Kothrud": (18.5074, 73.8077),
    "Hadapsar": (18.5089, 73.9260),
    "University": (18.5520, 73.8250)
}

# =========================
# TIME CONFIG
# =========================
base_date = datetime(2026, 4, 1)

hours = [0, 6, 8, 10, 12, 14, 16, 18, 20, 22]
weeks = [0, 7, 14]

# =========================
# STORAGE
# =========================
data = []

# =========================
# MAIN LOOP
# =========================
origin_coords = locations[MY_ORIGIN]

for dest_name, dest_coords in locations.items():

    if dest_name == MY_ORIGIN:
        continue

    print(f"\nProcessing: {MY_ORIGIN} → {dest_name}")

    start = f"{origin_coords[0]},{origin_coords[1]}"
    end = f"{dest_coords[0]},{dest_coords[1]}"

    for week in weeks:
        for day in range(7):
            for hour in hours:

                dt = base_date + timedelta(days=week + day, hours=hour)
                depart_time = dt.isoformat()

                url = f"https://api.tomtom.com/routing/1/calculateRoute/{start}:{end}/json"

                params = {
                    "key": API_KEY,
                    "departAt": depart_time,
                    "traffic": "true",
                    "computeTravelTimeFor": "all",
                    "maxAlternatives": 2,
                    "travelMode": "car"
                }

                try:
                    response = requests.get(url, params=params)

                    if response.status_code != 200:
                        print("API Error:", response.status_code)
                        continue

                    res = response.json()
                    routes = res.get("routes", [])

                    if not routes:
                        continue

                    route_data = []

                    # =========================
                    # EXTRACT FEATURES
                    # =========================
                    for i, route in enumerate(routes):
                        summary = route["summary"]

                        t = summary["travelTimeInSeconds"]
                        d = summary["lengthInMeters"]
                        delay = summary["trafficDelayInSeconds"]

                        avg_speed = (d / 1000) / (t / 3600) if t else 0
                        delay_ratio = delay / t if t else 0

                        route_data.append((i, t, d, delay, avg_speed, delay_ratio))

                    # =========================
                    # FIND BEST ROUTE
                    # =========================
                    best_time = min(r[1] for r in route_data)

                    # =========================
                    # STORE DATA
                    # =========================
                    for r in route_data:
                        data.append({
                            "origin": MY_ORIGIN,
                            "destination": dest_name,
                            "hour": hour,
                            "day_of_week": day,
                            "route_id": r[0],
                            "travel_time": r[1],
                            "distance": r[2],
                            "traffic_delay": r[3],
                            "avg_speed": r[4],
                            "delay_ratio": r[5],
                            "is_best_route": 1 if r[1] == best_time else 0
                        })

                    print(f"Done: {dest_name} | Day {day} | Hour {hour}")

                    time.sleep(0.7)

                except Exception as e:
                    print("Error:", e)

# =========================
# SAVE CSV
# =========================
df = pd.DataFrame(data)
filename = f"dataset_{MY_ORIGIN}.csv"
df.to_csv(filename, index=False)

print(f"\nSaved dataset: {filename}")