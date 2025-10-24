import os
import uuid
from fastapi.testclient import TestClient
from services.api.app.main import app


def _dbg_user():
    return str(uuid.UUID('11111111-1111-1111-1111-111111111111'))


def test_health():
    client = TestClient(app)
    r = client.get('/v1/health')
    assert r.status_code == 200
    assert r.json().get('ok') is True


def test_create_memory_flow(monkeypatch):
    # Requires DATABASE_URL pointing to test Postgres (CI provides)
    client = TestClient(app)
    headers = {'X-Debug-User': _dbg_user()}
    r = client.post('/v1/memories', json={'title': 'Test', 'visibility': 'PRIVATE'}, headers=headers)
    assert r.status_code == 200
    mid = r.json()['id']

    # Set core draft
    r = client.put(f'/v1/memories/{mid}/core', json={'narrative': 'Hello', 'anchors': [], 'people': []}, headers=headers)
    assert r.status_code == 200

    # Lock core
    r = client.post(f'/v1/memories/{mid}/lock', headers=headers)
    assert r.status_code == 200
    assert 'version' in r.json()

    # Append text layer
    r = client.post(f'/v1/memories/{mid}/layers', json={'kind': 'TEXT', 'text_content': 'layer'}, headers=headers)
    assert r.status_code == 200

    # Get memory detail
    r = client.get(f'/v1/memories/{mid}', headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data['id'] == mid
    assert len(data['layers']) >= 1
