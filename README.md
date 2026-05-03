# LogiTwin Pune - Urban Logistics Route Intelligence System

Predict the best route for a future dispatch window using AI and real-time traffic intelligence.

## Overview

Urban logistics teams do not just need the fastest route right now. They need to know which route is likely to perform best when a vehicle actually leaves, especially when dispatches are planned 10, 20, or 30 minutes ahead.

LogiTwin Pune addresses this problem by combining:

- live route alternatives from the TomTom Routing API
- historical traffic-aware route data sampled across Pune
- a supervised machine learning model that ranks the available routes for a user-selected future time

The result is a route intelligence system that helps planners answer questions like:

- Which of the current route options is most likely to be best at 6:30 PM?
- Should the driver leave now, or wait 10 to 30 minutes for better traffic conditions?
- How confident is the model in the recommendation?

The current implementation is scoped to a predefined Pune route network:

- Swargate
- Hinjewadi
- Kothrud
- Hadapsar
- University

## Why This Project Exists

Traffic conditions in urban logistics are highly variable. A route that looks reasonable now may become the worst option by the time a dispatch begins. Standard routing systems usually optimize for the present moment, but logistics operations often need short-horizon future prediction.

LogiTwin Pune fills that gap by using a hybrid approach:

- the routing API provides current route alternatives and route geometry
- the ML model estimates which of those alternatives is most likely to be best at the selected future time

## Features

- Multi-route comparison across up to 3 TomTom route alternatives
- Future-time route prediction based on historical 10-minute traffic patterns
- ML-based route ranking using supervised classification
- Wait recommendation across short offsets: 10, 15, 20, and 30 minutes
- Confidence scoring for each route option
- Interactive map visualization with route highlighting
- Route comparison panel for travel time, distance, and route priority
- Time controls using both date/time selection and a future-window slider

## System Architecture

```text
Frontend (React + Mapbox)
        |
        v
Backend API (FastAPI)
        |
        v
TomTom Routing API  --->  Current route alternatives + geometry
        |
        v
Feature Extraction + Historical Dataset Lookup
        |
        v
ML Model (scikit-learn RandomForestClassifier)
        |
        v
Wait Recommendation Engine
        |
        v
JSON Response
        |
        v
Interactive UI Rendering
```

### End-to-End Flow

1. The user selects an origin, destination, and future dispatch time in the frontend.
2. The React app sends a `POST /predict-route` request to the FastAPI backend.
3. The backend fetches the currently available route options from the TomTom Routing API.
4. The backend builds model features by combining:
   - route metrics from TomTom
   - historical travel behavior for the same origin-destination pair
   - temporal features from the user-selected future time
5. The trained ML model scores each route with a probability of being the best route.
6. The backend ranks the routes, builds a wait recommendation, and returns a UI-friendly response.
7. The frontend renders the routes on the map and highlights the best option using color-coded route risk levels.

## How It Works

### A. Data Collection

Historical route data is collected using the TomTom Routing API.

- Source file: `backend/datafetch.py`
- Multiple source-destination pairs are sampled across Pune
- Data is collected at every 10-minute interval
- The collection window covers 3 weeks of historical data
- Each request captures the primary route plus up to 2 alternatives, for a total of up to 3 routes
- Each route stores traffic-aware travel metrics such as travel time, distance, and traffic delay
- The route with the minimum travel time for that time slot is labeled as the best route

The current collection script loops over:

- 3 weekly windows
- 7 days per week
- hourly samples from 06:00 to 23:50
- 10-minute time slots: `00, 10, 20, 30, 40, 50`

### B. Feature Engineering

The model uses route and time-based features for each route alternative.

Core features:

- `travel_time`
- `distance`
- `traffic_delay`
- `avg_speed`
- `delay_ratio`
- `hour`
- `minute`
- `day_of_week`

Derived features:

- `avg_speed = distance / time`
- `delay_ratio = traffic_delay / travel_time`

Implementation details used in the current codebase:

- `origin` and `destination` are encoded numerically
- `minute_of_day = hour * 60 + minute` is added during training and inference
- future-time route estimates are interpolated between the nearest historical 10-minute samples

### C. Model Training

The project uses supervised learning to rank route alternatives.

- Source file: `backend/model.py`
- Model type: `RandomForestClassifier`
- Training objective: classify whether a route is the best route for a given time slot
- Input: route metrics + encoded origin-destination + time features
- Output: probability that the route is the best route
- Training dataset: `backend/final_dataset.csv`

In practice, each route option becomes one training sample with a binary label:

- `1` if the route was the best route for that timestamp
- `0` otherwise

### D. Prediction Flow

The prediction flow combines live API output with historical ML context.

1. The backend receives `origin`, `destination`, and `future_time`.
2. It validates that the selected places are supported by the model.
3. It fetches the currently available TomTom routes for those locations.
4. It loads historical route observations for the same origin-destination pair and day of week.
5. It replaces time-dependent route metrics with future-time estimates derived from the historical dataset.
6. It builds a feature row for each current route alternative.
7. The model runs `predict_proba(...)` and assigns a confidence score to each route.
8. The route with the highest probability is returned as the best route.
9. The frontend receives ranked routes, confidence values, and wait guidance.

This design is important:

- TomTom supplies the live route options and map geometry
- the ML model supplies the future-time ranking logic

### E. Wait Recommendation Logic

The wait recommendation is handled in `backend/wait_recommendation.py`.

- The system evaluates short offsets: `[10, 15, 20, 30]` minutes
- It reruns the route prediction for each offset
- It compares the predicted best-route travel time against the current predicted travel time
- It recommends waiting only if the improvement is meaningful

Current logic in the repository:

- minimum savings threshold: `5 minutes`
- trend labels: `improving`, `stable`, `worsening`
- output includes a user-facing message and a compact trend summary for the UI

## ML Model and API Integration

This project is built around a hybrid integration pattern rather than a standalone ML model or a standalone routing API.

### TomTom Routing API

TomTom is used for:

- current route alternatives
- route geometry for map rendering
- travel time, distance, and traffic delay metrics

### Machine Learning Model

The ML layer is used for:

- ranking the current alternatives for a future dispatch time
- estimating which route is most likely to be best
- generating route confidence scores

### Why Both Are Needed

Using only TomTom would answer: "What looks best right now?"

Using only the model would miss:

- live route alternatives
- live geometry for visualization
- current route availability context

By combining both, the system can answer:

- "Among the routes available right now, which one is most likely to be best when I leave later?"

## Tech Stack

| Layer | Technologies | Purpose |
| --- | --- | --- |
| Frontend | React, Axios, Mapbox GL JS | User interface, API calls, route visualization |
| Backend | Python, FastAPI, Pydantic, Uvicorn | Prediction API and request handling |
| Data / ML | pandas, NumPy, scikit-learn, joblib | Data preparation, training, inference, model persistence |
| External API | TomTom Routing API | Live route alternatives and traffic-aware route metrics |

## Project Structure

The repository uses file names that map directly to the project responsibilities.

```text
traffic_analyzer_pune/
|-- backend/
|   |-- app.py                    # FastAPI app and API endpoints
|   |-- datafetch.py              # Historical route data collection from TomTom
|   |-- model.py                  # Model training script
|   |-- predict_best_route.py     # Core inference and feature construction
|   |-- wait_recommendation.py    # Wait-or-leave-now decision logic
|   |-- label_encoding.py         # Encodes place names for training datasets
|   |-- merged.py                 # Dataset merge utility
|   |-- requirements.txt          # Python dependencies
|   |-- route_model.pkl           # Trained ML model artifact
|   `-- final_dataset.csv         # Main training dataset
|-- frontend/
|   |-- package.json
|   |-- public/
|   |   `-- index.html
|   `-- src/
|       |-- App.js
|       |-- styles.css
|       |-- components/
|       |   |-- InputPanel.js
|       |   |-- MapComponent.js
|       |   |-- RouteComparisonPanel.js
|       |   `-- RoutePanel.js
|       `-- utils/
|           `-- formatters.js
|-- data/                         # Additional dataset versions and merged outputs
`-- README.md
```

Equivalent logical mapping:

- `data_collection.py` role -> `backend/datafetch.py`
- `train_model.py` role -> `backend/model.py`
- `predict.py` role -> `backend/predict_best_route.py` and `backend/wait_recommendation.py`

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- TomTom Routing API key
- Mapbox public token for full frontend map rendering

### Backend Setup

1. Move into the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create `backend/.env` and add your TomTom key:

```env
TOMTOM_API_KEY=your_tomtom_api_key_here
```

5. Run the backend server:

```bash
uvicorn app:app --reload
```

The API will be available at:

- `http://127.0.0.1:8000`

Useful endpoints:

- `GET /health`
- `POST /predict-route`

### Frontend Setup

1. Open a new terminal and move into the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `frontend/.env`:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
REACT_APP_MAPBOX_TOKEN=your_mapbox_public_token_here
```

4. Start the React development server:

```bash
npm start
```

The frontend will run at:

- `http://localhost:3000`

### Optional: Re-collect Data

If you want to regenerate historical samples:

- update `API_KEY` and `MY_ORIGIN` in `backend/datafetch.py`
- run the script from the `backend/` directory

```bash
python datafetch.py
```

Note: the current collection script stores configuration directly in the file. For production use, move these values into environment variables or a secret manager.

### Optional: Retrain the Model

To retrain the classifier on the current dataset:

```bash
cd backend
python model.py
```

This regenerates:

- `backend/route_model.pkl`

## API Usage

### Example Request

```json
{
  "origin": "Swargate",
  "destination": "Hinjewadi",
  "future_time": "2026-05-03T18:30:00+05:30"
}
```

### Example cURL

```bash
curl -X POST http://127.0.0.1:8000/predict-route \
  -H "Content-Type: application/json" \
  -d "{\"origin\":\"Swargate\",\"destination\":\"Hinjewadi\",\"future_time\":\"2026-05-03T18:30:00+05:30\"}"
```

## Sample Output

Illustrative response shape:

```json
{
  "best_route_index": 0,
  "prediction_context": {
    "future_time": "2026-05-03T18:30:00+05:30",
    "future_hour": 18,
    "future_minute": 30,
    "future_day": 6,
    "uses_future_estimates": true
  },
  "routes": [
    {
      "route_index": 0,
      "confidence": 0.91,
      "priority": "high",
      "color": "green",
      "travel_time": 2180.0,
      "distance": 19469.0,
      "traffic_delay": 220.0,
      "current_travel_time": 2360.0,
      "current_distance": 19469.0,
      "points": [
        [73.8620, 18.5018],
        [73.8589, 18.5076]
      ]
    },
    {
      "route_index": 1,
      "confidence": 0.58,
      "priority": "medium",
      "color": "orange",
      "travel_time": 2315.0,
      "distance": 20580.0,
      "traffic_delay": 340.0,
      "current_travel_time": 2440.0,
      "current_distance": 20580.0,
      "points": [
        [73.8620, 18.5018],
        [73.8531, 18.5134]
      ]
    },
    {
      "route_index": 2,
      "confidence": 0.26,
      "priority": "low",
      "color": "red",
      "travel_time": 2490.0,
      "distance": 21210.0,
      "traffic_delay": 510.0,
      "current_travel_time": 2575.0,
      "current_distance": 21210.0,
      "points": [
        [73.8620, 18.5018],
        [73.8479, 18.5182]
      ]
    }
  ],
  "confidence_scores": [0.91, 0.58, 0.26],
  "wait_recommendation": {
    "action": "WAIT",
    "wait_minutes": 15,
    "time_saved": 6.5,
    "message": "Wait 15 mins to save ~6.5 mins",
    "current_travel_time": 36.3,
    "best_future_travel_time": 29.8,
    "trend_direction": "improving",
    "trend_points": [
      { "label": "Now", "offset_minutes": 0, "travel_time": 36.3 },
      { "label": "+10 min", "offset_minutes": 10, "travel_time": 32.7 },
      { "label": "+15 min", "offset_minutes": 15, "travel_time": 29.8 },
      { "label": "+20 min", "offset_minutes": 20, "travel_time": 30.5 },
      { "label": "+30 min", "offset_minutes": 30, "travel_time": 31.1 }
    ],
    "insight": "Traffic congestion is expected to decrease shortly."
  }
}
```

Note: the current FastAPI endpoint returns route-level confidence inside each object in `routes`. The `confidence_scores` array shown above represents the underlying model output and is included here to document the full logical prediction structure.

## UI Explanation

The frontend is designed as an operational route intelligence dashboard rather than a simple map.

- Map view: shows multiple current route alternatives over Pune
- Color coding:
  - green -> best predicted route
  - orange -> backup route
  - red -> highest delay risk among the available options
- Route comparison panel: compares route duration, distance, and confidence side by side
- Confidence score: shows how strongly the model favors a route
- Future-time controls: users can select a future date/time and also adjust a slider in 10-minute steps up to 7 days
- Wait recommendation panel: explains whether leaving later is likely to reduce travel time
- Trend bars: show predicted travel times for the evaluated wait offsets

## Demo Flow

User selects source and destination  
-> selects a future dispatch time  
-> system fetches current route alternatives from TomTom  
-> backend estimates future-time route performance  
-> ML model ranks the routes  
-> UI highlights the best route  
-> system optionally suggests waiting if a short delay is expected to save time

## Future Improvements

- Add real-time traffic refresh without requiring a full manual prediction cycle
- Expand the historical dataset beyond 3 weeks
- Support more granular prediction below 10-minute intervals
- Add route caching to reduce repeated API calls
- Support more Pune locations and dynamic geocoding
- Add model monitoring, accuracy tracking, and retraining automation
- Expose richer API analytics for fleet dashboards

## Limitations

- Prediction quality depends on TomTom API accuracy and route availability
- Historical coverage is limited to the collected dataset
- The current demo scope is restricted to a fixed set of Pune locations
- Unusual events such as accidents, road closures, weather shocks, or public gatherings may reduce prediction reliability
- Future route geometry is not forecast independently; the system uses current route shapes and future-time route scoring
- The current data collection utility is not yet production-hardened for secret management or scheduling

## Summary

LogiTwin Pune is a full-stack route intelligence system that blends live routing data with machine learning to support future-time logistics decisions. It does not only answer which route is fastest now. It helps answer which route is likely to be best when the trip actually starts, and whether waiting a few minutes could improve the outcome.
