#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test "$(uname -s)" = Darwin || { echo '需要 macOS 與 Xcode'; exit 1; }
: "${IOS_TEAM_ID:?請先設定你的 Apple Developer Team ID，並在 Xcode 登入}"
node scripts/prepare-ios.mjs
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath ios-build/FieldCAD.xcarchive DEVELOPMENT_TEAM="$IOS_TEAM_ID" -allowProvisioningUpdates archive
printf '\n在 Xcode Organizer 檢查封存、簽署與發佈條款後，再選 Distribute App / App Store Connect。此腳本不會上傳。\n'
