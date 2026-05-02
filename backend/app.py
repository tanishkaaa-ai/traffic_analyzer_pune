from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .predict_best_route import predict_best_route
except ImportError:
    from predict_best_route import predict_best_route


class PredictRouteRequest(BaseModel):
    origin: str
    destination: str
    future_time: str


app = FastAPI(title="LogiTwin Pune Route Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict-route")
def predict_route(payload: PredictRouteRequest) -> dict[str, Any]:
    try:
        prediction = predict_best_route(
            origin=payload.origin,
            destination=payload.destination,
            future_time=payload.future_time,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "prediction_context": prediction["prediction_context"],
        "best_route_index": prediction["best_route_index"],
        "routes": prediction["frontend_routes"],
    }
