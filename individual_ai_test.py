#!/usr/bin/env python3
"""
Individual AI Endpoint Testing
"""

import requests
import json
import time

BACKEND_URL = "https://d9477c72-2e2a-49b4-b5fb-7b6188985871.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_individual_endpoints():
    # Create session first
    response = requests.post(f"{API_BASE}/session/create", timeout=10)
    if response.status_code != 200:
        print("❌ Could not create session")
        return
    
    session_id = response.json()["session_id"]
    print(f"✅ Session created: {session_id}")
    
    # Test each AI endpoint individually
    endpoints_to_test = [
        ("Dashboard", f"/ai/dashboard/{session_id}", "GET", {}),
        ("Traceability Matrix", f"/ai/traceability-matrix/{session_id}", "GET", {}),
        ("Health Metrics", f"/ai/health-metrics/{session_id}", "GET", {}),
        ("Chat", "/ai/chat", "POST", {"session_id": session_id, "message": "Hello"}),
        ("Comprehensive Analysis", "/ai/comprehensive-analysis", "POST", {"session_id": session_id}),
        ("Comprehensive Report", "/ai/comprehensive-report", "POST", {"session_id": session_id}),
        ("Code Suggestions", "/ai/code-suggestions", "POST", {
            "session_id": session_id, 
            "file_name": "test.py", 
            "code_snippet": "def test():", 
            "cursor_position": 10
        }),
    ]
    
    for name, endpoint, method, params in endpoints_to_test:
        try:
            print(f"\n--- Testing {name} ---")
            
            if method == "GET":
                response = requests.get(f"{API_BASE}{endpoint}", timeout=5)
            else:
                response = requests.post(f"{API_BASE}{endpoint}", params=params, timeout=5)
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {name}: SUCCESS - Response keys: {list(data.keys())}")
            elif response.status_code == 404:
                print(f"⚠️  {name}: NOT FOUND (404) - Expected for some endpoints without data")
            elif response.status_code == 400:
                print(f"⚠️  {name}: BAD REQUEST (400) - {response.text[:100]}")
            elif response.status_code == 500:
                print(f"❌ {name}: SERVER ERROR (500) - {response.text[:100]}")
            else:
                print(f"❌ {name}: UNEXPECTED STATUS {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"⏰ {name}: TIMEOUT (endpoint exists but processing takes too long)")
        except Exception as e:
            print(f"❌ {name}: ERROR - {str(e)}")
        
        time.sleep(1)

if __name__ == "__main__":
    test_individual_endpoints()