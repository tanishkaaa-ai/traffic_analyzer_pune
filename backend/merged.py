import pandas as pd

df1 = pd.read_csv("final_dataset_encoded.csv")
df2 = pd.read_csv("final_dataset_encoded40.csv")

merged = pd.concat([df1, df2], ignore_index=True)
merged.to_csv("final_dataset_encoded.csv", index=False)