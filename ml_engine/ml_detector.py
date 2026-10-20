import pandas as pd
import numpy as np
import os
import sys
import re
from urllib.parse import unquote
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score
from flask import Flask, request, jsonify

app = Flask(__name__)

rf_model = None
if_model = None
sequence_model = None
metrics = {}

# Sequence Window Tracker
WINDOW_SIZE = 10
recent_requests = []

# Class Mapping
ATTACK_TYPES = ['BENIGN', 'SQL_INJECTION', 'XSS', 'PATH_TRAVERSAL', 'BRUTE_FORCE', 'ABNORMAL_TRAFFIC']
type_to_idx = {t: i for i, t in enumerate(ATTACK_TYPES)}
idx_to_type = {i: t for i, t in enumerate(ATTACK_TYPES)}

def extract_features(row):
    """ Extract numerical features from log data """
    endpoint = str(row.get('endpoint', ''))
    decoded_endpoint = unquote(endpoint)
    
    bytes_trans = int(row.get('bytes', 500))
    interval = int(row.get('interval_ms', 100))
    status = int(row.get('status', 200))
    is_post = 1 if row.get('method', 'GET').upper() == 'POST' else 0
    url_length = len(decoded_endpoint)
    
    has_sql = 1 if re.search(r"('|OR|SELECT|DROP|UNION|--|#)", decoded_endpoint, re.IGNORECASE) or "%27" in endpoint.lower() or "%20or%20" in endpoint.lower() else 0
    has_xss = 1 if re.search(r"(<script>|onerror|alert|<img|javascript:)", decoded_endpoint, re.IGNORECASE) or "%3cscript" in endpoint.lower() else 0
    has_traversal = 1 if "../" in decoded_endpoint or "..\\" in decoded_endpoint or "..%2f" in endpoint.lower() or "etc/passwd" in decoded_endpoint else 0
    
    # New features: rate proxy (inverse interval), is_4xx, is_5xx
    rate = 1000.0 / (interval + 1)
    is_4xx = 1 if 400 <= status < 500 else 0
    is_5xx = 1 if 500 <= status < 600 else 0

    return [bytes_trans, interval, status, is_post, url_length, has_sql, has_xss, has_traversal, rate, is_4xx, is_5xx]

def build_sequence_data(features_list, labels_list, window_size=10):
    X_seq, y_seq = [], []
    for i in range(len(features_list) - window_size):
        # Flatten the window into a single 1D array for MLP
        flat_window = np.array(features_list[i:i+window_size]).flatten()
        X_seq.append(flat_window)
        y_seq.append(labels_list[i+window_size-1])
    return np.array(X_seq), np.array(y_seq)

def train_model():
    global rf_model, if_model, sequence_model, metrics
    
    csv_path = os.path.join(os.path.dirname(__file__), 'synthetic_web_logs.csv')
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run generate_dataset.py first.", file=sys.stderr)
        return False
        
    print(f"Loading dataset from {csv_path}...", file=sys.stderr)
    df = pd.read_csv(csv_path)
    
    X = []
    y_multi = []
    y_binary = []
    
    for _, row in df.iterrows():
        X.append(extract_features(row))
        lbl = row.get('attack_type', 'BENIGN')
        y_multi.append(type_to_idx.get(lbl, 0))
        y_binary.append(row.get('is_anomaly', 0))
        
    X = np.array(X)
    y_multi = np.array(y_multi)
    y_binary = np.array(y_binary)
    
    print("Training Random Forest Classifier (Multi-class)...", file=sys.stderr)
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X, y_multi)
    
    print("Training Isolation Forest (Behavioral)...", file=sys.stderr)
    benign_X = X[y_binary == 0]
    if_model = IsolationForest(contamination=0.05, random_state=42)
    if_model.fit(benign_X)
    
    print("Training Sequence Model (MLP Proxy for LSTM)...", file=sys.stderr)
    X_seq, y_seq = build_sequence_data(X, y_binary, window_size=WINDOW_SIZE)
    
    sequence_model = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=500, random_state=42)
    sequence_model.fit(X_seq, y_seq)
    
    print("Models trained successfully!", file=sys.stderr)
    return True

@app.route('/analyze', methods=['POST'])
def analyze_log():
    global recent_requests
    
    if rf_model is None or if_model is None or sequence_model is None:
        return jsonify({"status": "error", "message": "Models not trained"}), 500
        
    data = request.json
    try:
        features = extract_features(data)
        features_np = np.array([features])
        
        # 1. Random Forest Score
        rf_pred_idx = rf_model.predict(features_np)[0]
        rf_attack_type = idx_to_type.get(rf_pred_idx, 'BENIGN')
        rf_probs = rf_model.predict_proba(features_np)[0]
        rf_confidence = float(np.max(rf_probs))
        rf_score = float(1.0 - rf_probs[0]) 
        
        # 2. Isolation Forest Score
        if_score = float(if_model.decision_function(features_np)[0])
        behavior_score = max(0.0, min(1.0, 0.5 - if_score)) 
        
        # 3. Sequence Model Score
        recent_requests.append(features)
        if len(recent_requests) > WINDOW_SIZE:
            recent_requests.pop(0)
            
        seq_score_val = 0.0
        if len(recent_requests) == WINDOW_SIZE:
            flat_seq = np.array(recent_requests).flatten().reshape(1, -1)
            seq_probs = sequence_model.predict_proba(flat_seq)[0]
            seq_score_val = float(seq_probs[1])
            
        # 4. Score Fusion
        final_score = (0.50 * rf_score) + (0.25 * behavior_score) + (0.25 * seq_score_val)
        
        risk_level = "LOW"
        is_anomaly = False
        if final_score > 0.75:
            risk_level = "CRITICAL"
            is_anomaly = True
        elif final_score >= 0.40:
            risk_level = "HIGH"
            is_anomaly = True
        elif final_score >= 0.25:
            risk_level = "MEDIUM"
            is_anomaly = True
            
        # features array: [bytes_trans, interval, status, is_post, url_length, has_sql, has_xss, has_traversal, rate, is_4xx, is_5xx]
        if features[5] == 1: # has_sql
            rf_attack_type = 'SQL_INJECTION'
            is_anomaly = True
            risk_level = "CRITICAL"
        elif features[6] == 1: # has_xss
            rf_attack_type = 'XSS'
            is_anomaly = True
            risk_level = "CRITICAL"
        elif features[7] == 1: # has_traversal
            rf_attack_type = 'PATH_TRAVERSAL'
            is_anomaly = True
            risk_level = "HIGH"
            
        if rf_attack_type == 'BENIGN' and is_anomaly:
            # If the behavioral model (Isolation Forest) flagged it but signatures didn't catch it
            # It's likely a volumetric attack like Brute Force or general abnormal traffic
            if int(data.get('interval_ms', 100)) < 100:
                rf_attack_type = 'BRUTE_FORCE'
            else:
                rf_attack_type = 'ABNORMAL_TRAFFIC'
            
        return jsonify({
            "status": "success",
            "is_anomaly": is_anomaly,
            "attack_type": rf_attack_type,
            "rf_score": round(rf_score, 3),
            "behavior_score": round(behavior_score, 3),
            "sequence_score": round(seq_score_val, 3),
            "final_score": round(final_score, 3),
            "confidence": round(rf_confidence, 3),
            "risk": risk_level,
            "message": "Anomaly Detected!" if is_anomaly else "Log looks normal."
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "model": "loaded"
    }), 200

if __name__ == '__main__':
    if train_model():
        print("Starting ML Detection API on port 5000...", file=sys.stderr)
        app.run(host='0.0.0.0', port=5000, debug=False)
