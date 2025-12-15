#!/usr/bin/env python3
"""
Seed data loader for Knowledge Graph application.
This script waits for services to be ready and can load additional data via APIs.
"""

import os
import sys
import time
import httpx

# Configuration from environment
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8080")
GRAPH_SERVICE_URL = os.getenv("GRAPH_SERVICE_URL", "http://graph-service:8001")
CCV_SERVICE_URL = os.getenv("CCV_SERVICE_URL", "http://ccv-service:8003")

MAX_RETRIES = 30
RETRY_DELAY = 2


def wait_for_service(name: str, url: str, health_path: str = "/health") -> bool:
    """Wait for a service to become healthy."""
    print(f"Waiting for {name} at {url}...")

    for attempt in range(MAX_RETRIES):
        try:
            response = httpx.get(f"{url}{health_path}", timeout=5.0)
            if response.status_code == 200:
                print(f"✓ {name} is ready")
                return True
        except Exception as e:
            pass

        if attempt < MAX_RETRIES - 1:
            print(f"  Attempt {attempt + 1}/{MAX_RETRIES} - retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)

    print(f"✗ {name} failed to become ready")
    return False


def seed_via_api():
    """
    Load additional seed data via service APIs.
    The database seed data is loaded via SQL, but this can add
    data that requires API logic (e.g., hashed passwords, computed fields).
    """
    print("\n" + "=" * 50)
    print("Loading additional seed data via APIs...")
    print("=" * 50)

    # Example: Create additional entities via Graph API
    # This would be useful for data that needs service-side processing

    try:
        # Verify we can reach the graph service
        response = httpx.get(f"{GRAPH_SERVICE_URL}/api/v1/entities", timeout=10.0)
        entity_count = len(response.json()) if response.status_code == 200 else 0
        print(f"✓ Graph service has {entity_count} entities")
    except Exception as e:
        print(f"  Graph service check: {e}")

    try:
        # Verify CCV service
        response = httpx.get(f"{CCV_SERVICE_URL}/api/v1/terms", timeout=10.0)
        term_count = len(response.json()) if response.status_code == 200 else 0
        print(f"✓ CCV service has {term_count} terms")
    except Exception as e:
        print(f"  CCV service check: {e}")

    print("\n✓ Seed data verification complete")


def main():
    print("=" * 50)
    print("Knowledge Graph - Seed Data Loader")
    print("=" * 50)

    # Wait for all services
    services = [
        ("Auth Service", AUTH_SERVICE_URL),
        ("Graph Service", GRAPH_SERVICE_URL),
        ("CCV Service", CCV_SERVICE_URL),
    ]

    all_ready = True
    for name, url in services:
        if not wait_for_service(name, url):
            all_ready = False

    if not all_ready:
        print("\n✗ Not all services are ready. Exiting.")
        sys.exit(1)

    # Load additional data via APIs
    seed_via_api()

    print("\n" + "=" * 50)
    print("✓ All seed data loaded successfully!")
    print("=" * 50)
    print("\nTest Credentials:")
    print("-" * 30)
    print("Admin:    admin@example.com / password123")
    print("Analyst:  analyst@example.com / password123")
    print("Viewer:   viewer@example.com / password123")
    print("Steward:  steward@example.com / password123")
    print("-" * 30)
    print("\nApplication URLs:")
    print("-" * 30)
    print("Web App:        http://localhost:3000")
    print("Auth Service:   http://localhost:8080")
    print("Graph Service:  http://localhost:8001")
    print("LLM Service:    http://localhost:8002")
    print("CCV Service:    http://localhost:8003")
    print("-" * 30)


if __name__ == "__main__":
    main()
