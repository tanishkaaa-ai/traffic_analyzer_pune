import pandas as pd

df = pd.read_csv("final_dataset.csv")

# Example: rows 5 to 10 (inclusive)
start = 1
end = 23821

df.loc[start:end, 'minute'] = 0.0

df.to_csv("final_dataset.csv", index=False)