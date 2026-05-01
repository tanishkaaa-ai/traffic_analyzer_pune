"""Transform the base traffic dataset into an area-tuned Pune dataset."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
INPUT_PATH = BASE_DIR / "Traffic_Flow_Dataset.csv"
LEGACY_OUTPUT_PATH = BASE_DIR / "data" / "pune_dataset.csv"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / "logitwin_pune_dataset.csv"

AREAS = [
    "Hinjewadi",
    "Swargate",
    "University Circle",
    "Hadapsar",
    "Kothrud",
]

REQUIRED_COLUMNS = [
    "Vehicle_Density",
    "Average_Speed",
    "Hour_of_Day",
    "Day_of_Week",
    "Is_Peak_Hour",
    "Weather_Condition",
]

FINAL_COLUMNS = [
    "area",
    "Average_Speed",
    "Vehicle_Density",
    "Hour_of_Day",
    "Day_of_Week",
    "Is_Peak_Hour",
    "Weather_Condition",
]

DAY_NAME_MAP = {
    "mon": "Monday",
    "monday": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "wed": "Wednesday",
    "wednesday": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
    "sun": "Sunday",
    "sunday": "Sunday",
}

AREA_RULES = {
    "Hinjewadi": {
        "speed_factor": 0.4,
        "min_speed": 6.0,
        "density_factor": 2.5,
        "density_day_factors": {"Friday": 1.3},
        "rain_speed_factor": 0.4,
        "peak_ranges": ((8, 11), (17, 21)),
    },
    "Swargate": {
        "speed_factor": 0.5,
        "min_speed": 12.0,
        "density_factor": 2.2,
        "density_day_factors": {"Sunday": 1.4},
        "rain_speed_factor": 0.6,
        "peak_ranges": ((9, 13), (16, 21)),
    },
    "University Circle": {
        "speed_factor": 0.4,
        "min_speed": 7.0,
        "density_factor": 2.8,
        "density_day_factors": {},
        "rain_speed_factor": 0.3,
        "peak_ranges": ((8, 12), (17, 21)),
    },
    "Hadapsar": {
        "speed_factor": 0.6,
        "min_speed": 15.0,
        "density_factor": 1.8,
        "density_day_factors": {"Saturday": 0.8, "Sunday": 0.8},
        "rain_speed_factor": 0.5,
        "peak_ranges": ((9, 11), (17, 20)),
    },
    "Kothrud": {
        "speed_factor": 0.7,
        "min_speed": 18.0,
        "density_factor": 1.5,
        "density_day_factors": {"Saturday": 1.25, "Sunday": 1.25},
        "rain_speed_factor": 0.7,
        "peak_ranges": ((9, 11), (18, 21)),
    },
}


def normalize_day_name(day_value: Any) -> str:
    """Convert abbreviated or full day labels into a consistent full name."""
    normalized = str(day_value).strip().casefold()
    return DAY_NAME_MAP.get(normalized, str(day_value).strip())


def is_rain_condition(weather_value: Any) -> bool:
    """Treat both Rain and Rainy labels as rainy conditions."""
    return str(weather_value).strip().casefold() in {"rain", "rainy"}


def is_peak_hour_for_area(hour_of_day: int, area: str) -> int:
    """Return 1 when the hour falls inside an area's configured peak ranges."""
    for start_hour, end_hour in AREA_RULES[area]["peak_ranges"]:
        if start_hour <= hour_of_day <= end_hour:
            return 1
    return 0


def load_data(file_path: Path = INPUT_PATH) -> pd.DataFrame:
    """Load the source dataset and validate the required input columns."""
    dataset = pd.read_csv(file_path)

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in dataset.columns]
    if missing_columns:
        missing = ", ".join(missing_columns)
        raise ValueError(f"Dataset is missing required columns: {missing}")

    return dataset


def apply_area_rules(row: pd.Series, area: str) -> dict[str, Any]:
    """Apply Pune area tuning rules to one row copy."""
    rules = AREA_RULES[area]
    day_name = normalize_day_name(row["Day_of_Week"])
    hour_of_day = int(row["Hour_of_Day"])

    average_speed = float(row["Average_Speed"]) * float(rules["speed_factor"])
    average_speed = float(np.maximum(average_speed, float(rules["min_speed"])))

    if is_rain_condition(row["Weather_Condition"]):
        average_speed *= float(rules["rain_speed_factor"])

    vehicle_density = float(row["Vehicle_Density"]) * float(rules["density_factor"])
    vehicle_density *= float(rules["density_day_factors"].get(day_name, 1.0))

    return {
        "area": area,
        "Average_Speed": average_speed,
        "Vehicle_Density": vehicle_density,
        "Hour_of_Day": hour_of_day,
        "Day_of_Week": row["Day_of_Week"],
        "Is_Peak_Hour": is_peak_hour_for_area(hour_of_day, area),
        "Weather_Condition": row["Weather_Condition"],
    }


def transform_row(row: pd.Series) -> list[dict[str, Any]]:
    """Expand one source row into area-specific Pune traffic records."""
    return [apply_area_rules(row, area) for area in AREAS]


def save_data(dataset: pd.DataFrame, output_path: Path) -> None:
    """Persist the transformed dataset to CSV, creating folders if needed."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(output_path, index=False)


def build_transformed_dataset(source_data: pd.DataFrame) -> pd.DataFrame:
    """Transform the full source dataset into the final Pune dataset."""
    transformed_rows: list[dict[str, Any]] = []

    for _, row in source_data.iterrows():
        transformed_rows.extend(transform_row(row))

    transformed_dataset = pd.DataFrame(transformed_rows, columns=FINAL_COLUMNS)
    return transformed_dataset[FINAL_COLUMNS]


def main() -> None:
    """Run the full Pune dataset transformation pipeline."""
    source_data = load_data()
    transformed_dataset = build_transformed_dataset(source_data)

    save_data(transformed_dataset, OUTPUT_PATH)
    save_data(transformed_dataset, LEGACY_OUTPUT_PATH)

    print(
        "Transformed Pune dataset saved to "
        f"'{OUTPUT_PATH}' and '{LEGACY_OUTPUT_PATH}'."
    )


if __name__ == "__main__":
    main()
