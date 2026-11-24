#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test "$(uname -s)" = Darwin || { echo '需要 macOS 與 Xcode'; exit 1; }
node scripts/prepare-ios.mjs "$@"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios-build CODE_SIGNING_ALLOWED=NO build
printf '\nSimulator app: ios-build/Build/Products/Debug-iphonesimulator/App.app\n'
