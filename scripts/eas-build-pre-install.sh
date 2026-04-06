#!/bin/bash
# EAS Build hook: runs after pod install, before xcodebuild
# Copies legacy ExpoModulesCore headers that the prebuilt XCFramework drops

set -e

LEGACY_DIR="node_modules/expo-modules-core/ios/Legacy"
PROTOCOLS_DIR="$LEGACY_DIR/Protocols"

# Find the ExpoModulesCore headers directory in Pods
HEADERS_PUBLIC=$(find ios/Pods/Headers/Public/ExpoModulesCore -maxdepth 1 -name "ExpoModulesCore" -type d 2>/dev/null | head -1)
HEADERS_PRIVATE=$(find ios/Pods/Headers/Private/ExpoModulesCore -maxdepth 1 -name "ExpoModulesCore" -type d 2>/dev/null | head -1)

if [ -z "$HEADERS_PUBLIC" ]; then
  echo "[eas-hook] No public ExpoModulesCore headers dir found, skipping"
  exit 0
fi

echo "[eas-hook] Copying legacy ExpoModulesCore headers..."

# Copy all legacy protocol headers
for header in "$PROTOCOLS_DIR"/*.h; do
  if [ -f "$header" ]; then
    name=$(basename "$header")
    cp "$header" "$HEADERS_PUBLIC/$name" 2>/dev/null && echo "  copied $name to public" || true
    [ -n "$HEADERS_PRIVATE" ] && cp "$header" "$HEADERS_PRIVATE/$name" 2>/dev/null && echo "  copied $name to private" || true
  fi
done

# Also copy any other legacy headers that might be needed
for header in "$LEGACY_DIR"/*.h; do
  if [ -f "$header" ]; then
    name=$(basename "$header")
    cp "$header" "$HEADERS_PUBLIC/$name" 2>/dev/null && echo "  copied $name to public" || true
    [ -n "$HEADERS_PRIVATE" ] && cp "$header" "$HEADERS_PRIVATE/$name" 2>/dev/null && echo "  copied $name to private" || true
  fi
done

echo "[eas-hook] Legacy headers copied successfully"
