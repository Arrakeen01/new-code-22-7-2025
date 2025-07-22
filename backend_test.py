#!/usr/bin/env python3
"""
Backend API Testing Suite for CodeReview AI
Tests all backend endpoints with focus on zip download functionality
"""

import requests
import json
import base64
import time
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://d9477c72-2e2a-49b4-b5fb-7b6188985871.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class BackendTester:
    def __init__(self):
        self.session_id = None
        self.uploaded_files = []
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_api_health(self) -> bool:
        """Test basic API health check"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "CodeReview AI Backend" in data["message"]:
                    self.log_test("API Health Check", True, "Backend is running and responding correctly")
                    return True
                else:
                    self.log_test("API Health Check", False, "Unexpected response format", data)
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_session_creation(self) -> bool:
        """Test session creation endpoint"""
        try:
            response = requests.post(f"{API_BASE}/session/create", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "session_id" in data and "message" in data:
                    self.session_id = data["session_id"]
                    self.log_test("Session Creation", True, f"Session created: {self.session_id}")
                    return True
                else:
                    self.log_test("Session Creation", False, "Missing session_id or message in response", data)
                    return False
            else:
                self.log_test("Session Creation", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Session Creation", False, f"Request error: {str(e)}")
            return False
    
    def test_file_upload(self) -> bool:
        """Test file upload functionality"""
        if not self.session_id:
            self.log_test("File Upload", False, "No session_id available")
            return False
        
        try:
            # Create sample code file content
            sample_code = """
# Sample Python Code for Testing
def calculate_fibonacci(n):
    '''Calculate fibonacci number'''
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

def main():
    print("Fibonacci sequence:")
    for i in range(10):
        print(f"F({i}) = {calculate_fibonacci(i)}")

if __name__ == "__main__":
    main()
"""
            
            # Encode content as base64
            encoded_content = base64.b64encode(sample_code.encode()).decode()
            
            # Prepare upload request
            upload_data = {
                "name": "fibonacci_calculator.py",
                "content": encoded_content,
                "size": len(sample_code),
                "type": "code",
                "mime_type": "text/x-python"
            }
            
            response = requests.post(
                f"{API_BASE}/files/upload",
                json=upload_data,
                params={"session_id": self.session_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "file_id" in data and "message" in data:
                    self.uploaded_files.append({
                        "file_id": data["file_id"],
                        "name": "fibonacci_calculator.py",
                        "content": sample_code
                    })
                    self.log_test("File Upload", True, f"File uploaded successfully: {data['file_id']}")
                    return True
                else:
                    self.log_test("File Upload", False, "Missing file_id or message in response", data)
                    return False
            else:
                self.log_test("File Upload", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("File Upload", False, f"Request error: {str(e)}")
            return False
    
    def test_additional_file_upload(self) -> bool:
        """Upload a second file to test zip with multiple files"""
        if not self.session_id:
            self.log_test("Additional File Upload", False, "No session_id available")
            return False
        
        try:
            # Create sample JavaScript file content
            sample_js = """
// Sample JavaScript Code for Testing
function calculateFactorial(n) {
    if (n <= 1) return 1;
    return n * calculateFactorial(n - 1);
}

function displayFactorials() {
    console.log("Factorial calculations:");
    for (let i = 1; i <= 10; i++) {
        console.log(`${i}! = ${calculateFactorial(i)}`);
    }
}

displayFactorials();
"""
            
            # Encode content as base64
            encoded_content = base64.b64encode(sample_js.encode()).decode()
            
            # Prepare upload request
            upload_data = {
                "name": "factorial_calculator.js",
                "content": encoded_content,
                "size": len(sample_js),
                "type": "code",
                "mime_type": "text/javascript"
            }
            
            response = requests.post(
                f"{API_BASE}/files/upload",
                json=upload_data,
                params={"session_id": self.session_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "file_id" in data:
                    self.uploaded_files.append({
                        "file_id": data["file_id"],
                        "name": "factorial_calculator.js",
                        "content": sample_js
                    })
                    self.log_test("Additional File Upload", True, f"Second file uploaded: {data['file_id']}")
                    return True
                else:
                    self.log_test("Additional File Upload", False, "Missing file_id in response", data)
                    return False
            else:
                self.log_test("Additional File Upload", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Additional File Upload", False, f"Request error: {str(e)}")
            return False
    
    def test_session_files_retrieval(self) -> bool:
        """Test retrieving files for a session"""
        if not self.session_id:
            self.log_test("Session Files Retrieval", False, "No session_id available")
            return False
        
        try:
            response = requests.get(f"{API_BASE}/files/session/{self.session_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "files" in data and "stats" in data:
                    files_count = len(data["files"])
                    expected_count = len(self.uploaded_files)
                    
                    if files_count == expected_count:
                        self.log_test("Session Files Retrieval", True, f"Retrieved {files_count} files as expected")
                        return True
                    else:
                        self.log_test("Session Files Retrieval", False, 
                                    f"Expected {expected_count} files, got {files_count}", data)
                        return False
                else:
                    self.log_test("Session Files Retrieval", False, "Missing files or stats in response", data)
                    return False
            else:
                self.log_test("Session Files Retrieval", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Session Files Retrieval", False, f"Request error: {str(e)}")
            return False
    
    def test_zip_download(self) -> bool:
        """Test the new zip download functionality - PRIORITY TEST"""
        if not self.session_id:
            self.log_test("Zip Download", False, "No session_id available")
            return False
        
        if not self.uploaded_files:
            self.log_test("Zip Download", False, "No uploaded files to download")
            return False
        
        try:
            response = requests.get(f"{API_BASE}/files/download-zip/{self.session_id}", timeout=30)
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                if 'application/zip' not in content_type:
                    self.log_test("Zip Download", False, f"Wrong content type: {content_type}")
                    return False
                
                # Check content disposition header
                content_disposition = response.headers.get('content-disposition', '')
                if 'attachment' not in content_disposition or '.zip' not in content_disposition:
                    self.log_test("Zip Download", False, f"Wrong content disposition: {content_disposition}")
                    return False
                
                # Check if we got actual zip content
                zip_content = response.content
                if len(zip_content) < 100:  # Zip files should be at least 100 bytes
                    self.log_test("Zip Download", False, f"Zip content too small: {len(zip_content)} bytes")
                    return False
                
                # Check zip file signature (first 4 bytes should be PK\x03\x04 or PK\x05\x06)
                if not (zip_content.startswith(b'PK\x03\x04') or zip_content.startswith(b'PK\x05\x06')):
                    self.log_test("Zip Download", False, "Invalid zip file signature")
                    return False
                
                # Try to validate zip content by extracting it
                try:
                    import zipfile
                    import io
                    
                    zip_buffer = io.BytesIO(zip_content)
                    with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
                        file_list = zip_file.namelist()
                        
                        # Check if our uploaded files are in the zip
                        expected_files = [f["name"] for f in self.uploaded_files]
                        missing_files = [f for f in expected_files if f not in file_list]
                        
                        if missing_files:
                            self.log_test("Zip Download", False, f"Missing files in zip: {missing_files}")
                            return False
                        
                        # Verify file contents
                        for uploaded_file in self.uploaded_files:
                            try:
                                zip_file_content = zip_file.read(uploaded_file["name"]).decode()
                                if zip_file_content.strip() != uploaded_file["content"].strip():
                                    self.log_test("Zip Download", False, 
                                                f"Content mismatch for {uploaded_file['name']}")
                                    return False
                            except Exception as e:
                                self.log_test("Zip Download", False, 
                                            f"Error reading {uploaded_file['name']} from zip: {str(e)}")
                                return False
                        
                        self.log_test("Zip Download", True, 
                                    f"Zip file valid with {len(file_list)} files: {file_list}")
                        return True
                        
                except Exception as e:
                    self.log_test("Zip Download", False, f"Error validating zip content: {str(e)}")
                    return False
                    
            elif response.status_code == 404:
                self.log_test("Zip Download", False, "No files found for session (404)")
                return False
            else:
                self.log_test("Zip Download", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Zip Download", False, f"Request error: {str(e)}")
            return False
    
    def test_empty_session_zip_download(self) -> bool:
        """Test zip download for session with no files"""
        try:
            # Create a new session for this test
            response = requests.post(f"{API_BASE}/session/create", timeout=10)
            if response.status_code != 200:
                self.log_test("Empty Session Zip Download", False, "Could not create test session")
                return False
            
            empty_session_id = response.json()["session_id"]
            
            # Try to download zip for empty session
            response = requests.get(f"{API_BASE}/files/download-zip/{empty_session_id}", timeout=10)
            
            if response.status_code == 404:
                self.log_test("Empty Session Zip Download", True, "Correctly returned 404 for empty session")
                return True
            else:
                self.log_test("Empty Session Zip Download", False, 
                            f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Empty Session Zip Download", False, f"Request error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("=" * 60)
        print("CODEREVIEW AI BACKEND TESTING SUITE")
        print("=" * 60)
        print(f"Testing backend at: {API_BASE}")
        print()
        
        # Test sequence
        tests = [
            ("API Health Check", self.test_api_health),
            ("Session Creation", self.test_session_creation),
            ("File Upload", self.test_file_upload),
            ("Additional File Upload", self.test_additional_file_upload),
            ("Session Files Retrieval", self.test_session_files_retrieval),
            ("Zip Download (PRIORITY)", self.test_zip_download),
            ("Empty Session Zip Download", self.test_empty_session_zip_download),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n--- Running {test_name} ---")
            if test_func():
                passed += 1
            time.sleep(1)  # Brief pause between tests
        
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Passed: {passed}/{total}")
        print(f"Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  SOME TESTS FAILED")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)