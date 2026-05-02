# import requests

# API_KEY = "BMZmflqUPCD2uM25nFRw31bOehWVLd6n"

# url = f"https://api.tomtom.com/routing/matrix/2?key={API_KEY}"

# body = {
#     "origins": [
#         {"point": {"latitude": 18.5018, "longitude": 73.8620}}  # Swargate
#     ],
#     "destinations": [
#         {"point": {"latitude": 18.5912, "longitude": 73.7389}}  # Hinjewadi
#     ],
#     "options": {
#         "departAt": "2024-06-03T18:00:00",
#         "traffic": "historical",
#         "travelMode": "car"
#     }
# }

# response = requests.post(url, json=body)

# print("Status:", response.status_code)
# print(response.json())



# import requests

# url = "https://tomtom.com"
# params = {
#     'key': 'FxptPCaN1LnleMPKA1Cqx81ZvmR4tgMf',
#     'departAt': '2024-11-20T09:00:00',
#     'traffic': 'true',
#     'computeTravelTimeFor': 'all'
# }

# response = requests.get(url, params=params)
# data = response.json()

# # Accessing the historical data
# summary = data['routes'][0]['summary']
# print(f"Historical Travel Time: {summary['historicTrafficTravelTimeInSeconds']} seconds")



# import requests

# # --- CONFIGURATION ---
# api_key = "FxptPCaN1LnleMPKA1Cqx81ZvmR4tgMf"
# start_coords = "18.5912,73.7389"  # Hinjewadi
# end_coords = "18.5018,73.8620"    # Swargate
# departure_time = "2024-11-20T09:00:00"  # Format: YYYY-MM-DDTHH:mm:ss

# # --- CONSTRUCT URL ---
# url = f"https://tomtom.com{start_coords}:{end_coords}/json"

# params = {
#     'key': api_key,
#     'departAt': departure_time,
#     'traffic': 'true',
#     'computeTravelTimeFor': 'all'
# }

# # --- MAKE REQUEST ---
# print("Fetching historical data...")
# response = requests.get(url, params=params)

# if response.status_code == 200:
#     data = response.json()
#     # The 'summary' contains the historical stats
#     summary = data['routes'][0]['summary']
    
#     historical_time = summary.get('historicTrafficTravelTimeInSeconds')
#     live_time = summary.get('liveTrafficIncidentsTravelTimeInSeconds')
#     no_traffic_time = summary.get('noTrafficTravelTimeInSeconds')

#     print("-" * 30)
#     print(f"ROUTE SUMMARY (Hinjewadi to Swargate)")
#     print("-" * 30)
#     print(f"Historical Travel Time: {historical_time / 60:.2f} minutes")
#     print(f"Live Traffic Time:       {live_time / 60:.2f} minutes")
#     print(f"No Traffic (Baseline):  {no_traffic_time / 60:.2f} minutes")
#     print("-" * 30)
# else:
#     print(f"Error: {response.status_code}")
#     print(response.text)


# import requests

# api_key = "FxptPCaN1LnleMPKA1Cqx81ZvmR4tgMf"
# start_coords = "18.5912,73.7389"
# end_coords = "18.5018,73.8620"
# departure_time = "2024-11-20T09:00:00"

# url = f"https://api.tomtom.com/routing/1/calculateRoute/{start_coords}:{end_coords}/json"

# params = {
#     "key": api_key,
#     "departAt": departure_time,
#     "traffic": "true",
#     "computeTravelTimeFor": "all"
# }

# print("Fetching historical data...")
# response = requests.get(url, params=params)

# if response.status_code == 200:
#     data = response.json()
#     summary = data["routes"][0]["summary"]

#     historical_time = summary.get("historicTrafficTravelTimeInSeconds")
#     live_time = summary.get("liveTrafficIncidentsTravelTimeInSeconds")
#     no_traffic_time = summary.get("noTrafficTravelTimeInSeconds")

#     print("-" * 30)
#     print("ROUTE SUMMARY (Hinjewadi to Swargate)")
#     print("-" * 30)
#     print(f"Historical Travel Time: {historical_time / 60:.2f} minutes")
#     print(f"Live Traffic Time:       {live_time / 60:.2f} minutes")
#     print(f"No Traffic (Baseline):   {no_traffic_time / 60:.2f} minutes")
#     print("-" * 30)
# else:
#     print(f"Error: {response.status_code}")
#     print(response.text)


# import requests
# import json

# api_key = "FxptPCaN1LnleMPKA1Cqx81ZvmR4tgMf"
# start_coords = "18.5912,73.7389"
# end_coords = "18.5018,73.8620"
# departure_time = "2024-11-20T09:00:00"

# url = f"https://api.tomtom.com/routing/1/calculateRoute/{start_coords}:{end_coords}/json"

# params = {
#     "key": api_key,
#     "departAt": departure_time,
#     "traffic": "true",
#     "computeTravelTimeFor": "all"
# }

# print("Fetching historical data...")
# response = requests.get(url, params=params)

# if response.status_code == 200:
#     data = response.json()
#     route = data["routes"][0]
#     summary = route["summary"]

#     historical_time = summary.get("historicTrafficTravelTimeInSeconds")
#     live_time = summary.get("liveTrafficIncidentsTravelTimeInSeconds")
#     no_traffic_time = summary.get("noTrafficTravelTimeInSeconds")

#     print("-" * 30)
#     print("ROUTE SUMMARY (Hinjewadi to Swargate)")
#     print("-" * 30)
#     print(f"Historical Travel Time: {historical_time / 60:.2f} minutes")
#     print(f"Live Traffic Time:       {live_time / 60:.2f} minutes")
#     print(f"No Traffic (Baseline):   {no_traffic_time / 60:.2f} minutes")
#     print("-" * 30)

#     print("\nRoute coordinates:")
#     for leg in route["legs"]:
#         for point in leg["points"]:
#             print(f"{point['latitude']}, {point['longitude']}")
# else:
#     print(f"Error: {response.status_code}")
#     print(response.text)


import requests

# --- CONFIGURATION ---
api_key = "FxptPCaN1LnleMPKA1Cqx81ZvmR4tgMf"
start_coords = "18.5912,73.7389"   # Hinjewadi
end_coords = "18.5018,73.8620"     # Swargate
departure_time = "2024-11-20T09:00:00"

# --- URL ---
url = f"https://api.tomtom.com/routing/1/calculateRoute/{start_coords}:{end_coords}/json"

# --- PARAMETERS ---
params = {
    "key": api_key,
    "departAt": departure_time,
    "traffic": "true",
    "computeTravelTimeFor": "all",
    "maxAlternatives": 2
}

print("Fetching route data...")
response = requests.get(url, params=params)

if response.status_code == 200:
    data = response.json()
    routes = data.get("routes", [])

    if not routes:
        print("No routes found.")
    else:
        for i, route in enumerate(routes, 1):
            summary = route["summary"]

            historical_time = summary.get("historicTrafficTravelTimeInSeconds")
            live_time = summary.get("liveTrafficIncidentsTravelTimeInSeconds")
            no_traffic_time = summary.get("noTrafficTravelTimeInSeconds")
            distance_km = summary.get("lengthInMeters", 0) / 1000

            print("\n" + "=" * 40)
            print(f"ROUTE {i}")
            print("=" * 40)
            print(f"Distance: {distance_km:.2f} km")
            print(f"Historical Travel Time: {historical_time / 60:.2f} minutes")
            print(f"Live Traffic Time:      {live_time / 60:.2f} minutes")
            print(f"No Traffic Time:        {no_traffic_time / 60:.2f} minutes")

            print("\nSample route coordinates:")
            route_points = []
            for leg in route.get("legs", []):
                for point in leg.get("points", []):
                    route_points.append((point["latitude"], point["longitude"]))

            for lat, lng in route_points[:20]:
                print(f"{lat}, {lng}")

            print("\nTurn-by-turn instructions:")
            instructions = route.get("guidance", {}).get("instructions", [])
            if instructions:
                for step_no, step in enumerate(instructions, 1):
                    message = step.get("message", "No instruction")
                    print(f"{step_no}. {message}")
            else:
                print("No instructions available.")

else:
    print(f"Error: {response.status_code}")
    print(response.text)
