# Option B: CloudKit schema import via `cktool`

Status: `cktool` is installed, but no CloudKit Management Token is currently saved on this Mac.

Observed error:

```text
No management token found in arguments, CLOUDKIT_MANAGEMENT_TOKEN environment variable, or built-in methods. (See: save-token)
```

## What Seth needs to provide

A **CloudKit Management Token** for the Apple Developer team:

```text
B2MV35NY53
```

and container:

```text
iCloud.com.thirty.app
```

## Once token is available

Save it locally without putting it in git or memory:

```bash
xcrun cktool save-token --type management --method keychain --force
```

Then paste the token into the secure interactive prompt.

After that, the agent can run:

```bash
xcrun cktool export-schema \
  --team-id B2MV35NY53 \
  --container-id iCloud.com.thirty.app \
  --environment development \
  --output-file /tmp/thirty-development-schema.json

xcrun cktool export-schema \
  --team-id B2MV35NY53 \
  --container-id iCloud.com.thirty.app \
  --environment production \
  --output-file /tmp/thirty-production-schema.json
```

Then import/deploy the challenge record types after validating the exact schema JSON shape.

## Never commit

- Management tokens
- Exported schema files if they contain private identifiers beyond schema
- Any `.env` edits containing secrets
