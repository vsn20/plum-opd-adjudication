"""Quick verification script - run all 10 test cases."""
import urllib.request
import json

BASE = "http://127.0.0.1:8000"
cases = [f"TC{str(i).zfill(3)}" for i in range(1, 11)]

print("=" * 60)
print("Running all 10 test cases...")
print("=" * 60)

passed = 0
for c in cases:
    try:
        req = urllib.request.Request(f"{BASE}/api/test/run/{c}", method="POST")
        resp = urllib.request.urlopen(req)
        d = json.loads(resp.read())
        status = d["status"]
        exp = d.get("expected", {}).get("decision", "?")
        act = d.get("actual", {}).get("decision", "?")
        mark = "[PASS]" if status == "PASS" else "[FAIL]"
        if status == "PASS":
            passed += 1
        print(f"  {mark} {c} | expected={exp:15s} actual={act}")
    except Exception as e:
        print(f"  [ERR]  {c} | {e}")

print("=" * 60)
print(f"Result: {passed}/{len(cases)} passed")
print("=" * 60)
