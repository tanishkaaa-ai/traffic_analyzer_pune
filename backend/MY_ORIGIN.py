import pandas as pd

files = [
    "dataset20_Swargate.csv",
    "dataset20_Hinjewadi.csv",
    "dataset20_Kothrud.csv",
    "dataset20_Hadapsar.csv",
    "dataset20_University.csv"
]

df_list = [pd.read_csv(f) for f in files]

final_df = pd.concat(df_list, ignore_index=True)

final_df.to_csv("final_dataset20.csv", index=False)

print("Merged dataset created: final_dataset20.csv")