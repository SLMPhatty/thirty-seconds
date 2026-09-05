#!/usr/bin/env bash
set -euo pipefail

TEAM_ID="${TEAM_ID:-B2MV35NY53}"
CONTAINER_ID="${CONTAINER_ID:-iCloud.com.thirty.app}"
TOKEN="${CLOUDKIT_MANAGEMENT_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  cat >&2 <<'EOF'
Missing CLOUDKIT_MANAGEMENT_TOKEN.

Create/copy a CloudKit Management Token from Apple CloudKit Console, then run:

  export CLOUDKIT_MANAGEMENT_TOKEN='paste-token-here'
  ./scripts/deploy-cloudkit-schema.sh

This script exports the Development schema for iCloud.com.thirty.app and imports it into Production.
EOF
  exit 1
fi

schema_file="$(mktemp -t thirty-cloudkit-development-schema.XXXXXX.json)"
trap 'rm -f "$schema_file"' EXIT

echo "Exporting Development schema for $CONTAINER_ID..."
xcrun cktool export-schema \
  --token "$TOKEN" \
  --team-id "$TEAM_ID" \
  --container-id "$CONTAINER_ID" \
  --environment development \
  --output-file "$schema_file"

if ! grep -q 'cloudkit.share' "$schema_file"; then
  cat >&2 <<EOF

WARNING: Development schema does not appear to contain cloudkit.share.
Open a development/debug build and create one challenge invite first, then rerun this script.
Production cannot create cloudkit.share until it exists in Development and is deployed.

Exported schema retained at: $schema_file
EOF
  trap - EXIT
  exit 2
fi

for required in 'CKChallenge' 'CKChallengeEntry' 'cloudkit.share'; do
  if ! grep -q "$required" "$schema_file"; then
    echo "WARNING: $required was not found in exported Development schema." >&2
  fi
done

echo "Validating Development schema against Production..."
xcrun cktool validate-schema \
  --token "$TOKEN" \
  --team-id "$TEAM_ID" \
  --container-id "$CONTAINER_ID" \
  --environment production \
  --file "$schema_file"

echo "Importing schema into Production..."
xcrun cktool import-schema \
  --token "$TOKEN" \
  --team-id "$TEAM_ID" \
  --container-id "$CONTAINER_ID" \
  --environment production \
  --validate \
  --file "$schema_file"

echo "Done. Retest the TestFlight challenge invite flow."
