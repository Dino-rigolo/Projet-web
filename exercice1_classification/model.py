import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import LabelEncoder
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import pickle

# Charger le dataset minimisé
df = pd.read_csv('ad_mini.csv')

# Préparer les données
# Encoder la variable Gender
le = LabelEncoder()
df['Gender'] = le.fit_transform(df['Gender'])

# Variables d'entrée
X = df[['Daily Time Spent on Site', 'Age', 'Area Income', 'Daily Internet Usage', 'Gender']]
y = df['Clicked on Ad']

# Diviser en train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Normaliser les données
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Construire le modèle
model = keras.Sequential([
    layers.Dense(64, activation='relu', input_shape=(5,)),
    layers.Dropout(0.2),
    layers.Dense(32, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(16, activation='relu'),
    layers.Dense(1, activation='sigmoid')
])

# Compiler le modèle
model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)

# Afficher le résumé
print(model.summary())

# Entraîner le modèle
history = model.fit(
    X_train_scaled, y_train,
    epochs=50,
    batch_size=32,
    validation_split=0.2,
    verbose=1
)

# Évaluer le modèle
loss, accuracy = model.evaluate(X_test_scaled, y_test)
print(f"\nAccuracy sur le test set : {accuracy:.4f}")

# Sauvegarder le modèle
model.save('ad_model.h5')
print("Modèle sauvegardé : ad_model.h5")

# Sauvegarder le scaler et le label encoder
with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
    
with open('label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)
    
print("Scaler et Label Encoder sauvegardés")
