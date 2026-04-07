#!/bin/bash
# Sync build number from app.json to native iOS files
# Run this BEFORE every EAS build to prevent duplicate build number rejections
# Usage: ./scripts/sync-build-number.sh

set -e
cd "$(dirname "$0")/.."

BUILD_NUM=$(node -e "console.log(JSON.parse(require('fs').readFileSync('app.json','utf8')).expo.ios.buildNumber)")

echo "Syncing build number: $BUILD_NUM"

# Update Info.plist
sed -i '' "s|<key>CFBundleVersion</key>.*<string>[^<]*</string>|<key>CFBundleVersion</key>\n\t<string>${BUILD_NUM}</string>|" ios/thirty/Info.plist

# Update project.pbxproj (both Debug and Release)
sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*/CURRENT_PROJECT_VERSION = ${BUILD_NUM}/g" ios/thirty.xcodeproj/project.pbxproj

# Verify
PLIST_NUM=$(grep -A1 CFBundleVersion ios/thirty/Info.plist | grep string | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
PROJ_NUMS=$(grep CURRENT_PROJECT_VERSION ios/thirty.xcodeproj/project.pbxproj | awk '{print $3}' | tr -d ';' | sort -u)

echo "app.json:        $BUILD_NUM"
echo "Info.plist:      $PLIST_NUM"
echo "project.pbxproj: $PROJ_NUMS"

if [ "$PLIST_NUM" != "$BUILD_NUM" ] || [ "$PROJ_NUMS" != "$BUILD_NUM" ]; then
  echo "❌ BUILD NUMBER MISMATCH — DO NOT BUILD"
  exit 1
fi

echo "✅ All build numbers in sync"
