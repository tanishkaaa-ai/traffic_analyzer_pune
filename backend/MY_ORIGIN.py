import pandas as pd

files = [
    "dataset_Swargate.csv",
    "dataset_Hinjewadi.csv",
    "dataset_Kothrud.csv",
    "dataset_Hadapsar.csv",
    "dataset_University.csv"
]

df_list = [pd.read_csv(f) for f in files]

final_df = pd.concat(df_list, ignore_index=True)

final_df.to_csv("final_dataset11.csv", index=False)

print("Merged dataset created: final_dataset1.csv")