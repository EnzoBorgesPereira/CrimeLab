import pandas as pd

# If columns appear in one string, they're likely comma-separated.
df = pd.read_csv("idf_data.csv", sep=',')
print(df.columns)  # Should now list separate columns
df_filtered = df[df["nom_dep"] == "Seine-et-Marne"]
df_filtered.to_csv("sem_data.csv", index=False)