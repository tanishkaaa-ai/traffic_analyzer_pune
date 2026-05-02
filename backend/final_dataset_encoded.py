import pandas as pd

df1 = pd.read_csv("final_dataset_encoded.csv")
df2 = pd.read_csv("final_dataset_encoded11.csv")

merged = pd.concat([df1, df2], ignore_index=True)
merged.to_csv("merged.csv", index=False)