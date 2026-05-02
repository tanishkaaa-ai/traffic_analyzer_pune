import pandas as pd

# Load dataset
df = pd.read_csv("final_dataset20.csv")

# Mapping (same everywhere)
place_mapping = {
    "Swargate": 0,
    "Hinjewadi": 1,
    "Kothrud": 2,
    "Hadapsar": 3,
    "University": 4
}

# Apply mapping
df["origin"] = df["origin"].map(place_mapping)
df["destination"] = df["destination"].map(place_mapping)

# Save updated dataset
df.to_csv("final_dataset_encoded20.csv", index=False)

print("Encoding done. Saved as final_dataset_encoded.csv")