// Adds iPhone Screen Time only when an Apple Team ID is provided, because
// Apple must approve the Family Controls entitlement before an iPhone can
// install a build that includes it. Android and web are unaffected.
//   APPLE_TEAM_ID=XXXXXXXXXX eas build -p ios --profile development
module.exports = ({ config }) => {
  const teamId = process.env.APPLE_TEAM_ID;
  const pitch = process.env.EXPO_PUBLIC_PITCH === '1';
  const plugins = [...(config.plugins ?? [])];
  if (teamId) {
    plugins.push(['react-native-device-activity', { appleTeamId: teamId, appGroup: 'group.com.learnshift.app' }]);
  }
  return {
    ...config,
    name: pitch ? 'LearnShift Pitch' : config.name,
    ios: {
      ...config.ios,
      ...(teamId ? { appleTeamId: teamId } : {}),
      bundleIdentifier: pitch ? 'com.learnshift.pitch' : config.ios.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: pitch ? 'com.learnshift.pitch' : config.android.package,
    },
    plugins,
    extra: { ...config.extra, screenTime: !!teamId },
  };
};
