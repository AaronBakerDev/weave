#!/usr/bin/env python3
"""
Comprehensive test script for Weave API endpoints.

This script tests the complete flow:
1. Create memory
2. Set/lock core
3. Append layers
4. Search
5. Get memory details

Usage:
    python test_endpoints.py [--base-url http://localhost:8000]
"""

import argparse
import requests
import json
import sys
from uuid import uuid4
from typing import Dict, Any


class WeaveAPITester:
    """Test harness for Weave API endpoints."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        # Use debug user for testing
        self.user_id = str(uuid4())
        self.session.headers.update({"X-Debug-User": self.user_id})
        self.memory_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log a message with formatting."""
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️",
        }.get(level, "•")
        print(f"{prefix} {message}")

    def check_response(self, response: requests.Response, expected_status: int = 200) -> Dict[str, Any]:
        """Check response status and return JSON data."""
        if response.status_code != expected_status:
            self.log(
                f"Unexpected status: {response.status_code} (expected {expected_status})",
                "ERROR"
            )
            self.log(f"Response: {response.text}", "ERROR")
            sys.exit(1)
        return response.json()

    def test_health(self):
        """Test the health endpoint."""
        self.log("Testing health endpoint...")
        response = self.session.get(f"{self.base_url}/v1/health")
        data = self.check_response(response)
        assert data.get("ok") is True, "Health check failed"
        self.log(f"Health check passed: {data}", "SUCCESS")

    def test_create_memory(self):
        """Test creating a memory."""
        self.log("Creating a new memory...")
        payload = {
            "title": "Trip to Cedar Point",
            "visibility": "PRIVATE",
            "seed_text": "We went to Cedar Point amusement park. It was an amazing day!"
        }
        response = self.session.post(
            f"{self.base_url}/v1/memories",
            json=payload
        )
        data = self.check_response(response)
        self.memory_id = data["id"]
        self.log(f"Memory created: {self.memory_id}", "SUCCESS")
        return data

    def test_set_core(self):
        """Test setting the core narrative."""
        if not self.memory_id:
            self.log("No memory ID available", "ERROR")
            sys.exit(1)

        self.log("Setting core narrative...")
        payload = {
            "narrative": "A thrilling day at Cedar Point with family, riding roller coasters and enjoying the summer weather.",
            "anchors": ["first visit", "summer vacation", "roller coasters"],
            "people": ["Dad", "Mom", "Sister"],
            "where": "Cedar Point, Sandusky, Ohio"
        }
        response = self.session.put(
            f"{self.base_url}/v1/memories/{self.memory_id}/core",
            json=payload
        )
        data = self.check_response(response)
        self.log(f"Core set: version={data.get('core_version')}, locked={data.get('locked')}", "SUCCESS")
        return data

    def test_lock_core(self):
        """Test locking the core."""
        if not self.memory_id:
            self.log("No memory ID available", "ERROR")
            sys.exit(1)

        self.log("Locking core...")
        response = self.session.post(
            f"{self.base_url}/v1/memories/{self.memory_id}/lock"
        )
        data = self.check_response(response)
        self.log(f"Core locked: version={data.get('version')}", "SUCCESS")
        return data

    def test_append_text_layer(self):
        """Test appending a text layer."""
        if not self.memory_id:
            self.log("No memory ID available", "ERROR")
            sys.exit(1)

        self.log("Appending text layer...")
        payload = {
            "kind": "TEXT",
            "text_content": "The Millennium Force was the highlight of the day. The first drop was incredible!"
        }
        response = self.session.post(
            f"{self.base_url}/v1/memories/{self.memory_id}/layers",
            json=payload
        )
        data = self.check_response(response)
        self.log(f"Text layer added: {data.get('layer_id')}", "SUCCESS")
        return data

    def test_append_reflection_layer(self):
        """Test appending a reflection layer."""
        if not self.memory_id:
            self.log("No memory ID available", "ERROR")
            sys.exit(1)

        self.log("Appending reflection layer...")
        payload = {
            "kind": "REFLECTION",
            "text_content": "Looking back, this was one of the best family days we've had. The kids were so happy."
        }
        response = self.session.post(
            f"{self.base_url}/v1/memories/{self.memory_id}/layers",
            json=payload
        )
        data = self.check_response(response)
        self.log(f"Reflection layer added: {data.get('layer_id')}", "SUCCESS")
        return data

    def test_get_memory(self):
        """Test getting memory details."""
        if not self.memory_id:
            self.log("No memory ID available", "ERROR")
            sys.exit(1)

        self.log("Fetching memory details...")
        response = self.session.get(
            f"{self.base_url}/v1/memories/{self.memory_id}"
        )
        data = self.check_response(response)

        # Verify all required fields
        assert "id" in data, "Missing id"
        assert "title" in data, "Missing title"
        assert "visibility" in data, "Missing visibility"
        assert "created_at" in data, "Missing created_at"
        assert "core" in data, "Missing core"
        assert "layers" in data, "Missing layers"
        assert "participants" in data, "Missing participants"
        assert "edges_summary" in data, "Missing edges_summary"

        # Check core structure
        if data["core"]:
            core = data["core"]
            assert "version" in core, "Core missing version"
            assert "narrative" in core, "Core missing narrative"
            assert "anchors" in core, "Core missing anchors"
            assert "people" in core, "Core missing people"
            assert "locked" in core, "Core missing locked"

        # Check layers
        layers = data["layers"]
        self.log(f"Found {len(layers)} layers", "INFO")
        for layer in layers:
            assert "id" in layer, "Layer missing id"
            assert "kind" in layer, "Layer missing kind"
            assert "created_at" in layer, "Layer missing created_at"

        # Check edges summary
        edges = data["edges_summary"]
        assert "counts" in edges, "Edges summary missing counts"
        assert "connections" in edges, "Edges summary missing connections"

        self.log(f"Memory details verified: {len(layers)} layers, core locked={data['core'].get('locked') if data['core'] else False}", "SUCCESS")
        return data

    def test_search(self):
        """Test search functionality."""
        self.log("Testing search...")

        # Wait a moment for indexing to potentially complete
        import time
        self.log("Waiting 3 seconds for indexing worker to process...", "INFO")
        time.sleep(3)

        payload = {"q": "Cedar Point roller coaster"}
        response = self.session.get(
            f"{self.base_url}/v1/search/associative",
            params={"q": "Cedar Point roller coaster", "limit": 10}
        )
        data = self.check_response(response)

        assert "query" in data, "Search missing query"
        assert "results" in data, "Search missing results"

        results = data["results"]
        self.log(f"Search returned {len(results)} results", "INFO")

        # Check result structure
        for result in results:
            assert "memory" in result, "Result missing memory"
            assert "score" in result, "Result missing score"
            assert "reasons" in result, "Result missing reasons"

            memory = result["memory"]
            assert "id" in memory, "Memory missing id"
            assert "title" in memory, "Memory missing title"

            # Check if reasons are populated
            reasons = result["reasons"]
            if reasons:
                self.log(f"  Memory: {memory['title']}, Score: {result['score']:.3f}, Reasons: {reasons}", "INFO")

        self.log(f"Search test passed with {len(results)} results", "SUCCESS")
        return data

    def run_all_tests(self):
        """Run all tests in sequence."""
        self.log("=" * 60)
        self.log("Starting Weave API Tests")
        self.log("=" * 60)

        try:
            # Test sequence
            self.test_health()
            self.test_create_memory()
            self.test_set_core()
            self.test_lock_core()
            self.test_append_text_layer()
            self.test_append_reflection_layer()
            self.test_get_memory()
            self.test_search()

            self.log("=" * 60)
            self.log("All tests passed successfully!", "SUCCESS")
            self.log("=" * 60)
            return True

        except Exception as e:
            self.log(f"Test failed with error: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False


def main():
    parser = argparse.ArgumentParser(description="Test Weave API endpoints")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the API (default: http://localhost:8000)"
    )
    args = parser.parse_args()

    tester = WeaveAPITester(base_url=args.base_url)
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
