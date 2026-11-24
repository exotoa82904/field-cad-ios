#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p ios-build
xcrun simctl list devices available --json > ios-build/simulators.json
DEVICE_ID=$(python3 -c 'import json; d=json.load(open("ios-build/simulators.json")); print(next(x["udid"] for k in sorted(d["devices"],reverse=True) if "iOS" in k for x in d["devices"][k] if x.get("isAvailable") and x["name"].startswith("iPhone")))')
BUNDLE_ID=$(node -p 'require("./capacitor.config.json").appId')
xcrun simctl boot "$DEVICE_ID" || true
xcrun simctl bootstatus "$DEVICE_ID" -b
xcrun simctl install "$DEVICE_ID" ios-build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"
CONTAINER=$(xcrun simctl get_app_container "$DEVICE_ID" "$BUNDLE_ID" data)
REPORT="$CONTAINER/Documents/field-cad-ci-result.json"
finish_logs() {
  xcrun simctl io "$DEVICE_ID" screenshot ios-build/simulator.png || true
  xcrun simctl spawn "$DEVICE_ID" log show --style compact --last 3m --predicate 'process == "App"' > ios-build/native-simulator.log || true
}
trap finish_logs EXIT
attempt=0
while [ "$attempt" -lt 90 ]; do
  if [ -f "$REPORT" ]; then
    cp "$REPORT" ios-build/field-cad-ci-result.json
    if python3 -c 'import json,sys; r=json.load(open("ios-build/field-cad-ci-result.json")); sys.exit(0 if r.get("status") in ("pass","fail") else 1)'; then
      if [ -f "$CONTAINER/Documents/ci-calibration.pdf" ]; then cp "$CONTAINER/Documents/ci-calibration.pdf" ios-build/ci-calibration.pdf; fi
      python3 -c 'import json; r=json.load(open("ios-build/field-cad-ci-result.json")); print(json.dumps(r,indent=2)); assert r["status"] == "pass", "Native simulator compatibility checks failed"'
      exit 0
    fi
  fi
  attempt=$((attempt + 1))
  sleep 2
done
echo 'iOS simulator app did not produce a completed report within 180 seconds.'
exit 1
