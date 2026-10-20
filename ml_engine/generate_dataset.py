import pandas as pd
import random
import numpy as np
import os
import time

# --- Parameters ---
TOTAL_EVENTS = 10000
OUTPUT_FILE = 'synthetic_web_logs.csv'

# Normal Endpoints & User Agents
NORMAL_ENDPOINTS = ['/index.html', '/home', '/about', '/api/users', '/images/logo.png', '/login']
METHODS = ['GET', 'POST']

# Anomaly Signatures
SQLI_PAYLOADS = ["' OR 1=1--", "'; DROP TABLE users--", "admin' #"]
XSS_PAYLOADS = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>"]
PATH_TRAVERSAL = ["../../../../etc/passwd", "../config.json"]

def generate_benign():
    method = random.choice(METHODS)
    endpoint = random.choice(NORMAL_ENDPOINTS)
    # Normal bytes: 200 to 5000
    bytes_transferred = int(np.random.normal(1500, 500))
    bytes_transferred = max(200, bytes_transferred)
    # Normal interval: 50ms to 5000ms
    interval_ms = int(random.expovariate(1/1000))
    interval_ms = max(10, interval_ms)
    # Login might fail normally occasionally
    if endpoint == '/login' and method == 'POST':
        status_code = random.choice([200, 200, 401])
    else:
        status_code = random.choice([200, 200, 200, 201, 301, 304, 404])
    return {
        'method': method,
        'endpoint': endpoint,
        'bytes': bytes_transferred,
        'interval_ms': interval_ms,
        'status': status_code,
        'is_anomaly': 0,
        'attack_type': 'BENIGN'
    }

def generate_attack(attack_type):
    method = random.choice(METHODS)
    endpoint = random.choice(NORMAL_ENDPOINTS)
    bytes_transferred = int(np.random.normal(1500, 500))
    interval_ms = int(random.expovariate(1/500))
    interval_ms = max(10, interval_ms)
    status_code = random.choice([200, 400, 403, 500])

    if attack_type == 'SQL_INJECTION':
        endpoint += "?id=" + random.choice(SQLI_PAYLOADS)
    elif attack_type == 'XSS':
        endpoint += "?q=" + random.choice(XSS_PAYLOADS)
    elif attack_type == 'PATH_TRAVERSAL':
        endpoint = random.choice(PATH_TRAVERSAL)
    elif attack_type == 'BRUTE_FORCE':
        method = 'POST'
        endpoint = '/login'
        status_code = 401
        interval_ms = random.randint(50, 300) # Fast consecutive requests
    elif attack_type == 'ABNORMAL_TRAFFIC':
        # High bytes or very fast requests but structurally normal URL
        bytes_transferred = random.randint(10000, 50000)
        interval_ms = random.randint(1, 10)
    
    return {
        'method': method,
        'endpoint': endpoint,
        'bytes': bytes_transferred,
        'interval_ms': interval_ms,
        'status': status_code,
        'is_anomaly': 1,
        'attack_type': attack_type
    }

def main():
    print(f"Generating {TOTAL_EVENTS} sequential logs with mixed attack scenarios...")
    data = []
    
    i = 0
    while i < TOTAL_EVENTS:
        # Determine next sequence
        # 90% chance of benign, 10% chance of attack block
        if random.random() < 0.90:
            # Generate a block of 1 to 20 benign requests
            num_benign = random.randint(1, 20)
            for _ in range(num_benign):
                if i >= TOTAL_EVENTS: break
                data.append(generate_benign())
                i += 1
        else:
            # Generate an attack block
            attack_type = random.choice(['SQL_INJECTION', 'XSS', 'PATH_TRAVERSAL', 'BRUTE_FORCE', 'ABNORMAL_TRAFFIC'])
            
            if attack_type == 'BRUTE_FORCE':
                num_attacks = random.randint(10, 30) # Brute force is a sequence
            elif attack_type == 'ABNORMAL_TRAFFIC':
                num_attacks = random.randint(5, 20)
            else:
                num_attacks = random.randint(1, 3) # Single or few attempts
                
            for _ in range(num_attacks):
                if i >= TOTAL_EVENTS: break
                data.append(generate_attack(attack_type))
                i += 1
                
    df = pd.DataFrame(data)
    filepath = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
    df.to_csv(filepath, index=False)
    print(f"Dataset generated at: {filepath}")
    
    # Print summary
    print("\nDataset Summary:")
    print(df['attack_type'].value_counts())

if __name__ == "__main__":
    main()
