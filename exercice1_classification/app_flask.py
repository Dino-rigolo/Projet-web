"""
Application Flask pour interroger le modèle de prédiction de click sur annonces
"""

from flask import Flask, render_template, request, jsonify
import numpy as np
import pickle
import tensorflow as tf
from tensorflow import keras
import os

app = Flask(__name__, template_folder='templates')

# Charger le modèle
try:
    model = keras.models.load_model('ad_model.h5')
    print("Modèle chargé : ad_model.h5")
except FileNotFoundError:
    print("ERREUR: ad_model.h5 non trouvé. Avez-vous exécuté model.py?")
    model = None

# Charger le scaler et le label encoder
try:
    with open('scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    print("Scaler chargé : scaler.pkl")
except FileNotFoundError:
    print("ERREUR: scaler.pkl non trouvé")
    scaler = None

try:
    with open('label_encoder.pkl', 'rb') as f:
        label_encoder = pickle.load(f)
    print("Label Encoder chargé : label_encoder.pkl")
except FileNotFoundError:
    print("ERREUR: label_encoder.pkl non trouvé")
    label_encoder = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # Récupérer les valeurs du formulaire
        daily_time = float(data['daily_time'])
        age = float(data['age'])
        area_income = float(data['area_income'])
        daily_internet = float(data['daily_internet'])
        gender = data['gender']
        
        # Encoder le genre
        gender_encoded = label_encoder.transform([gender])[0]
        
        # Préparer les données pour la prédiction
        features = np.array([[daily_time, age, area_income, daily_internet, gender_encoded]])
        features_scaled = scaler.transform(features)
        
        # Faire la prédiction
        prediction = model.predict(features_scaled, verbose=0)
        probability = float(prediction[0][0])
        
        return jsonify({
            'probability': probability,
            'will_click': probability > 0.5,
            'percentage': round(probability * 100, 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Démarrage du serveur Flask...")
    print("Accédez à: http://127.0.0.1:5000")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)
