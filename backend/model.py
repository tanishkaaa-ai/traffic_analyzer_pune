from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "final_dataset.csv"
MODEL_PATH = BASE_DIR / "route_model.pkl"

TARGET_COLUMN = "is_best_route"
TIME_COLUMNS = ["hour", "day_of_week", "minute"]
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
    "minute",
    "minute_of_day",
]


def load_dataset() -> pd.DataFrame:
    """Load the training dataset from backend/final_dataset.csv."""
    df = pd.read_csv(DATASET_PATH)
    print("Dataset shape:", df.shape)
    print(df.head())
    return df


def prepare_training_frame(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Build a stable training matrix that explicitly includes hour and minute."""
    if "route_id" in df.columns:
        df = df.drop(columns=["route_id"])

    if df.isnull().sum().sum() > 0:
        print("Warning: Null values found. Dropping them.")
        df = df.dropna()

    required_columns = set(FEATURE_COLUMNS) - {"minute_of_day"}
    required_columns.add(TARGET_COLUMN)
    missing_columns = sorted(required_columns - set(df.columns))
    if missing_columns:
        raise ValueError(f"Missing required columns for training: {missing_columns}")

    df = df.copy()
    for column in TIME_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    if df[TIME_COLUMNS].isnull().any().any():
        print("Warning: Invalid hour/day/minute values found. Dropping those rows.")
        df = df.dropna(subset=TIME_COLUMNS)

    df[TIME_COLUMNS] = df[TIME_COLUMNS].astype(int)
    df["minute_of_day"] = df["hour"] * 60 + df["minute"]

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    return X, y


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> RandomForestClassifier:
    """Train the route ranking model."""
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        random_state=42,
        n_jobs=1,
    )
    model.fit(X_train, y_train)
    return model


def main() -> None:
    df = load_dataset()
    X, y = prepare_training_frame(df)

    print("\nTraining features:")
    print(FEATURE_COLUMNS)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = train_model(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy:.4f}")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    feature_importances = (
        pd.Series(model.feature_importances_, index=FEATURE_COLUMNS)
        .sort_values(ascending=False)
    )
    print("\nFeature Importances:")
    print(feature_importances.to_string())

    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved as {MODEL_PATH.name}")

    sample = X_test.iloc[:3]
    probs = model.predict_proba(sample)

    print("\nSample Probabilities (class=1):")
    for i, probability in enumerate(probs):
        print(f"Route {i}: {probability[1]:.4f}")


if __name__ == "__main__":
    main()
