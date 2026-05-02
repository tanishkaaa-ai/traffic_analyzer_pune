import pandas as pd

DATASET_PREFIX = "dataset40"
OUTPUT_FILE = "final_dataset40.csv"

files = [
    f"{DATASET_PREFIX}_Swargate.csv",
    f"{DATASET_PREFIX}_Hinjewadi.csv",
    f"{DATASET_PREFIX}_Kothrud.csv",
    f"{DATASET_PREFIX}_Hadapsar.csv",
    f"{DATASET_PREFIX}_University.csv"
]

missing_files = [file for file in files if not pd.io.common.file_exists(file)]
if missing_files:
    raise FileNotFoundError(f"Missing dataset files: {', '.join(missing_files)}")

df_list = [pd.read_csv(f) for f in files]

final_df = pd.concat(df_list, ignore_index=True)

final_df.to_csv(OUTPUT_FILE, index=False)

print(f"Merged dataset created: {OUTPUT_FILE}")
