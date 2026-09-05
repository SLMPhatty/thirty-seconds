# CloudKit challenges schema

The `breathe together` feature uses the iCloud container:

```text
iCloud.com.thirty.app
```

Native Swift module:

```text
modules/thirty-cloudkit/ios/ThirtyCloudKitModule.swift
```

## Record types required

### CKChallenge

Created when starting a challenge.

Fields used by app code:

| Field | Type | Notes |
|---|---|---|
| `name` | String | Challenge display name |
| `createdAt` | Date/Time | Creation date |
| `creatorName` | String | Creator display name |
| `maxMembers` | Int(64) | Currently saved as `10` |

### CKChallengeEntry

Created when a member completes a session in a challenge.

Fields used by app code:

| Field | Type | Notes |
|---|---|---|
| `date` | String | Local `yyyy-MM-dd` |
| `completedAt` | Date/Time | Completion timestamp |
| `memberName` | String | Display name |

The current code queries `CKChallengeEntry` by `date == yyyy-MM-dd`, so make `date` queryable/indexed in CloudKit Dashboard.

## Why the production app can fail

If a TestFlight/App Store build shows:

```text
Did not find record type: CKChallenge
```

then the production CloudKit schema for `iCloud.com.thirty.app` is missing `CKChallenge`.

Development CloudKit can auto-create record types when a development build saves records. Production CloudKit does not auto-create schema at runtime; schema changes must be deployed/imported from the CloudKit Dashboard or `cktool` with a CloudKit management token.

## Manual fix in CloudKit Dashboard

1. Open Apple CloudKit Dashboard.
2. Select container `iCloud.com.thirty.app`.
3. Check **Development** and **Production** schemas.
4. Ensure both record types exist: `CKChallenge`, `CKChallengeEntry`.
5. Ensure fields above exist with the correct types.
6. Deploy schema changes to Production.
7. Retest creating a challenge from the installed/TestFlight app.

## CLI fix with cktool

Requires a CloudKit Management Token. The repo includes a helper that exports the Development schema and imports it into Production:

```bash
export CLOUDKIT_MANAGEMENT_TOKEN='...'
./scripts/deploy-cloudkit-schema.sh
```

The helper verifies that Development contains `cloudkit.share` before deploying. If it does not, create one challenge invite from a development/debug build first, then rerun the script.

Without a token, `cktool` reports:

```text
No management token found in arguments, CLOUDKIT_MANAGEMENT_TOKEN variable, or built-in methods.
```
