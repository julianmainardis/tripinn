#!/usr/bin/env python3
"""
TripInn Backend API Testing Suite
Tests the travel search flow as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://vibe-journey-2.preview.emergentagent.com/api"
TEST_EMAIL = "test@numa.app"
TEST_PASSWORD = "Test123!"

class TripInnAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_login(self):
        """Test POST /api/auth/login"""
        print("🔐 Testing Authentication...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_test(
                        "POST /api/auth/login", 
                        True, 
                        f"Login successful for {data['user']['email']}"
                    )
                    return True
                else:
                    self.log_test(
                        "POST /api/auth/login", 
                        False, 
                        "Missing token or user in response", 
                        data
                    )
            else:
                self.log_test(
                    "POST /api/auth/login", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
        
        return False
    
    def test_airport_search_madrid(self):
        """Test GET /api/airports/search?query=mad"""
        print("🛫 Testing Airport Search - Madrid...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/airports/search?query=mad",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if Madrid airport (MAD) is in results
                    madrid_found = any(airport.get("code") == "MAD" for airport in data)
                    if madrid_found:
                        madrid_airport = next(airport for airport in data if airport.get("code") == "MAD")
                        self.log_test(
                            "GET /api/airports/search?query=mad", 
                            True, 
                            f"Found Madrid airport: {madrid_airport.get('name', 'N/A')}"
                        )
                        return True
                    else:
                        self.log_test(
                            "GET /api/airports/search?query=mad", 
                            False, 
                            "Madrid airport (MAD) not found in results", 
                            data
                        )
                else:
                    self.log_test(
                        "GET /api/airports/search?query=mad", 
                        False, 
                        "Empty or invalid response format", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/airports/search?query=mad", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("GET /api/airports/search?query=mad", False, f"Exception: {str(e)}")
        
        return False
    
    def test_airport_search_barcelona(self):
        """Test GET /api/airports/search?query=bar"""
        print("🛫 Testing Airport Search - Barcelona...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/airports/search?query=bar",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if Barcelona airport (BCN) is in results
                    barcelona_found = any(airport.get("code") == "BCN" for airport in data)
                    if barcelona_found:
                        barcelona_airport = next(airport for airport in data if airport.get("code") == "BCN")
                        self.log_test(
                            "GET /api/airports/search?query=bar", 
                            True, 
                            f"Found Barcelona airport: {barcelona_airport.get('name', 'N/A')}"
                        )
                        return True
                    else:
                        self.log_test(
                            "GET /api/airports/search?query=bar", 
                            False, 
                            "Barcelona airport (BCN) not found in results", 
                            data
                        )
                else:
                    self.log_test(
                        "GET /api/airports/search?query=bar", 
                        False, 
                        "Empty or invalid response format", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/airports/search?query=bar", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("GET /api/airports/search?query=bar", False, f"Exception: {str(e)}")
        
        return False
    
    def test_travel_search_normal_budget(self):
        """Test POST /api/travel/search with normal budget"""
        print("🌍 Testing Travel Search - Normal Budget (800 EUR)...")
        
        if not self.auth_token:
            self.log_test("POST /api/travel/search (normal budget)", False, "No auth token available")
            return False
        
        try:
            search_request = {
                "origin_code": "MAD",
                "origin_city": "Madrid",
                "max_budget": 800,
                "date_from": "2026-05-10",
                "date_to": "2026-05-15",
                "adults": 2
            }
            
            response = self.session.post(
                f"{self.base_url}/travel/search",
                json=search_request,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["destinations", "search_params", "budget_breakdown", "note"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        f"Missing required fields: {missing_fields}", 
                        data
                    )
                    return False
                
                # Check destinations structure
                destinations = data.get("destinations", [])
                if not destinations:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        "No destinations returned", 
                        data
                    )
                    return False
                
                # Validate first destination structure
                first_dest = destinations[0]
                required_dest_fields = [
                    "flights_url", "hotels_url", "flight_estimate", 
                    "hotel_estimate_per_night", "hotel_estimate_total", 
                    "total_estimate", "within_budget"
                ]
                
                missing_dest_fields = [field for field in required_dest_fields if field not in first_dest]
                if missing_dest_fields:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        f"Missing destination fields: {missing_dest_fields}", 
                        first_dest
                    )
                    return False
                
                # Validate URL formats
                flights_url = first_dest.get("flights_url", "")
                hotels_url = first_dest.get("hotels_url", "")
                
                skyscanner_valid = "skyscanner.es" in flights_url
                booking_valid = "booking.com" in hotels_url
                
                if not skyscanner_valid:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        f"Invalid Skyscanner URL format: {flights_url}"
                    )
                    return False
                
                if not booking_valid:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        f"Invalid Booking.com URL format: {hotels_url}"
                    )
                    return False
                
                # Check budget logic (flights <= 50%, hotels <= 10% per night)
                max_budget = search_request["max_budget"]
                max_flight_budget = max_budget * 0.3
                max_hotel_per_night = max_budget * 0.1
                
                budget_logic_valid = True
                budget_issues = []
                
                for dest in destinations:
                    flight_cost = dest.get("flight_estimate", 0)
                    hotel_per_night = dest.get("hotel_estimate_per_night", 0)
                    
                    if flight_cost > max_flight_budget:
                        budget_logic_valid = False
                        budget_issues.append(f"Flight cost {flight_cost} > max {max_flight_budget}")
                    
                    if hotel_per_night > max_hotel_per_night:
                        budget_logic_valid = False
                        budget_issues.append(f"Hotel per night {hotel_per_night} > max {max_hotel_per_night}")
                
                if not budget_logic_valid:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        f"Budget logic violations: {budget_issues}"
                    )
                    return False
                
                # Check Spanish text in note
                note = data.get("note", "")
                spanish_indicators = ["precios", "haz", "clic", "enlaces", "actuales"]
                has_spanish = any(indicator in note.lower() for indicator in spanish_indicators)
                
                if not has_spanish:
                    self.log_test(
                        "POST /api/travel/search (normal budget)", 
                        False, 
                        f"Note doesn't appear to be in Spanish: {note}"
                    )
                    return False
                
                self.log_test(
                    "POST /api/travel/search (normal budget)", 
                    True, 
                    f"Found {len(destinations)} destinations with valid URLs and budget logic"
                )
                return True
                
            else:
                self.log_test(
                    "POST /api/travel/search (normal budget)", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("POST /api/travel/search (normal budget)", False, f"Exception: {str(e)}")
        
        return False
    
    def test_travel_search_low_budget(self):
        """Test POST /api/travel/search with low budget"""
        print("🌍 Testing Travel Search - Low Budget (100 EUR)...")
        
        if not self.auth_token:
            self.log_test("POST /api/travel/search (low budget)", False, "No auth token available")
            return False
        
        try:
            search_request = {
                "origin_code": "MAD",
                "origin_city": "Madrid",
                "max_budget": 100,
                "date_from": "2026-05-10",
                "date_to": "2026-05-15",
                "adults": 2
            }
            
            response = self.session.post(
                f"{self.base_url}/travel/search",
                json=search_request,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                destinations = data.get("destinations", [])
                
                # With 100 EUR budget, we expect fewer or no destinations
                # Budget logic: flights <= 50 EUR, hotels <= 10 EUR per night
                max_flight_budget = 50
                max_hotel_per_night = 10
                
                valid_destinations = 0
                for dest in destinations:
                    flight_cost = dest.get("flight_estimate", 0)
                    hotel_per_night = dest.get("hotel_estimate_per_night", 0)
                    
                    if flight_cost <= max_flight_budget and hotel_per_night <= max_hotel_per_night:
                        valid_destinations += 1
                
                # All returned destinations should meet budget constraints
                if len(destinations) == valid_destinations:
                    self.log_test(
                        "POST /api/travel/search (low budget)", 
                        True, 
                        f"Budget logic working: {len(destinations)} destinations within 100 EUR budget"
                    )
                    return True
                else:
                    self.log_test(
                        "POST /api/travel/search (low budget)", 
                        False, 
                        f"Budget logic failed: {valid_destinations}/{len(destinations)} destinations within budget"
                    )
            else:
                self.log_test(
                    "POST /api/travel/search (low budget)", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("POST /api/travel/search (low budget)", False, f"Exception: {str(e)}")
        
        return False
    
    def test_health_check(self):
        """Test GET /api/health"""
        print("🏥 Testing Health Check...")
        
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "healthy" and "TripInn API" in data.get("app", ""):
                    self.log_test(
                        "GET /api/health", 
                        True, 
                        f"Health check passed: {data.get('app')} v{data.get('version', 'unknown')}"
                    )
                    return True
                else:
                    self.log_test(
                        "GET /api/health", 
                        False, 
                        "Invalid health check response format", 
                        data
                    )
            else:
                self.log_test(
                    "GET /api/health", 
                    False, 
                    f"HTTP {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("GET /api/health", False, f"Exception: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all tests in the specified order"""
        print(f"🚀 Starting TripInn Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Test User: {TEST_EMAIL}")
        print("=" * 60)
        print()
        
        # Test sequence as specified in review request
        tests = [
            self.test_login,
            self.test_airport_search_madrid,
            self.test_airport_search_barcelona,
            self.test_travel_search_normal_budget,
            self.test_travel_search_low_budget,
            self.test_health_check
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests PASSED! TripInn backend is working correctly.")
            return True
        else:
            print("⚠️  Some tests FAILED. Check the details above.")
            return False

def main():
    """Main test runner"""
    tester = TripInnAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()