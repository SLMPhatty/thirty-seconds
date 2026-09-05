// Per-profile entitlements override. The static config still lives in app.json
// (Expo reads it automatically and passes it in as `config`). We only mutate
// fields that depend on the EAS build profile.
//
// EAS_BUILD_PROFILE is set by `eas build --profile <name>` and unset locally.
// For App Store submissions Apple requires aps-environment=production.

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const isProduction = profile === 'production';

  if (config.ios && config.ios.entitlements) {
    config.ios.entitlements['aps-environment'] = isProduction
      ? 'production'
      : 'development';
    config.ios.entitlements['com.apple.developer.icloud-container-environment'] = isProduction
      ? 'Production'
      : 'Development';
  }

  return config;
};
