import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# =========================
# 1. LOAD DATA
# =========================
df = pd.read_csv("final_dataset_encoded.csv")

# =========================
# 2. BASIC CHECKS
# =========================
print("Dataset shape:", df.shape)
print(df.head())

# =========================
# 3. PREPROCESSING
# =========================
# Drop route_id (not useful for learning)
if "route_id" in df.columns:
    df = df.drop(columns=["route_id"])

# Check for nulls
if df.isnull().sum().sum() > 0:
    print("Warning: Null values found. Dropping them.")
    df = df.dropna()

# =========================
# 4. SPLIT FEATURES & TARGET
# =========================
X = df.drop(columns=["is_best_route"])
y = df["is_best_route"]

# =========================
# 5. TRAIN-TEST SPLIT
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# =========================
# 6. TRAIN MODEL
# =========================
model = RandomForestClassifier(
    n_estimators=150,
    max_depth=12,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# =========================
# 7. EVALUATE MODEL
# =========================
y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print(f"\nModel Accuracy: {accuracy:.4f}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# =========================
# 8. SAVE MODEL
# =========================
joblib.dump(model, "route_model.pkl")
print("\nModel saved as route_model.pkl")

# =========================
# 9. TEST PROBABILITY OUTPUT
# =========================
sample = X_test.iloc[:3]

probs = model.predict_proba(sample)

print("\nSample Probabilities (class=1):")
for i, p in enumerate(probs):
    print(f"Route {i}: {p[1]:.4f}")