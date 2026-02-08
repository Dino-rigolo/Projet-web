"""
Script pour créer le dataset minimisé ad_mini.csv
Réduit le dataset original à 1000 instances par classe
Conserve uniquement les colonnes nécessaires
"""

import pandas as pd
import numpy as np

# Charger le dataset complet
df = pd.read_csv('ad_10000records.csv')

# Colonnes nécessaires
colonnes_necessaires = [
    'Daily Time Spent on Site',
    'Age',
    'Area Income',
    'Daily Internet Usage',
    'Gender',
    'Clicked on Ad'
]

# Sélectionner les colonnes
df_filtered = df[colonnes_necessaires]

# Séparer par classe (Clicked on Ad = 0 et 1)
df_class_0 = df_filtered[df_filtered['Clicked on Ad'] == 0]
df_class_1 = df_filtered[df_filtered['Clicked on Ad'] == 1]

# Prendre 1000 instances aléatoires par classe
df_class_0_sample = df_class_0.sample(n=min(1000, len(df_class_0)), random_state=42)
df_class_1_sample = df_class_1.sample(n=min(1000, len(df_class_1)), random_state=42)

# Combiner et mélanger
df_mini = pd.concat([df_class_0_sample, df_class_1_sample], ignore_index=True)
df_mini = df_mini.sample(frac=1, random_state=42).reset_index(drop=True)

# Sauvegarder
df_mini.to_csv('ad_mini.csv', index=False)
print(f"Dataset créé : ad_mini.csv")
print(f"Nombre d'instances : {len(df_mini)}")
print(f"Classes : \n{df_mini['Clicked on Ad'].value_counts()}")
