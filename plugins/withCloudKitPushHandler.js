const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

const MARKER = '// thirty-cloudkit:silent-push-handler';
const SHARE_MARKER = '// thirty-cloudkit:share-accept-handler';

const SILENT_PUSH_HANDLER = `
  ${MARKER}
  public override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    if userInfo["ck"] != nil || userInfo["aps"] is [String: Any] {
      NotificationCenter.default.post(
        name: Notification.Name("ThirtyCloudKitSilentPush"),
        object: nil,
        userInfo: userInfo
      )
    }
    completionHandler(.newData)
  }
`;

const SHARE_ACCEPT_HANDLER = `
  ${SHARE_MARKER}
  public func application(
    _ application: UIApplication,
    userDidAcceptCloudKitShareWith cloudKitShareMetadata: CKShare.Metadata
  ) {
    // Never early-return on missing share.url — it is often nil here.
    // Stash full metadata; JS unlocks then calls acceptPendingShare / acceptShare.
    ThirtyCloudKitShareBridge.stashPendingInvite(cloudKitShareMetadata)
  }
`;

function injectHandler(contents) {
  if (!contents.includes('import CloudKit')) {
    contents = contents.replace('import ReactAppDependencyProvider', 'import ReactAppDependencyProvider\nimport CloudKit');
  }
  if (!contents.includes('import ThirtyCloudKit')) {
    contents = contents.replace('import CloudKit', 'import CloudKit\ninternal import ThirtyCloudKit');
  }

  if (contents.includes(MARKER)) return contents;

  // Insert before the final closing brace of the AppDelegate class.
  // We look for the "// Linking API" comment (already present) and insert above it,
  // or fall back to the last "}" of the class.
  const linkingApiMarker = '// Linking API';
  if (contents.includes(linkingApiMarker)) {
    return contents.replace(linkingApiMarker, `${SILENT_PUSH_HANDLER}\n  ${linkingApiMarker}`);
  }

  // Fallback: inject before the closing brace of AppDelegate class
  const classEndPattern = /(\n})\s*\n\s*class ReactNativeDelegate/;
  return contents.replace(classEndPattern, `\n${SILENT_PUSH_HANDLER}$1\n\nclass ReactNativeDelegate`);
}

function injectShareAcceptHandler(contents) {
  if (!contents.includes('import CloudKit')) {
    contents = contents.replace('import ReactAppDependencyProvider', 'import ReactAppDependencyProvider\nimport CloudKit');
  }
  if (!contents.includes('import ThirtyCloudKit')) {
    contents = contents.replace('import CloudKit', 'import CloudKit\ninternal import ThirtyCloudKit');
  }
  if (contents.includes(SHARE_MARKER)) return contents;

  const linkingApiMarker = '// Linking API';
  if (contents.includes(linkingApiMarker)) {
    return contents.replace(linkingApiMarker, `${SHARE_ACCEPT_HANDLER}\n  ${linkingApiMarker}`);
  }

  const classEndPattern = /(\n})\s*\n\s*class ReactNativeDelegate/;
  return contents.replace(classEndPattern, `\n${SHARE_ACCEPT_HANDLER}$1\n\nclass ReactNativeDelegate`);
}

module.exports = function withCloudKitPushHandler(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CKSharingSupported = true;
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error(
        'withCloudKitPushHandler only supports Swift AppDelegate (expected for SDK 50+).'
      );
    }
    cfg.modResults.contents = injectShareAcceptHandler(injectHandler(cfg.modResults.contents));
    return cfg;
  });
};
