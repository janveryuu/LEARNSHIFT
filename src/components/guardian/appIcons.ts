import type { ImageSourcePropType } from 'react-native';

/** Real app logos for the guardian's app list, keyed by Android package. */
const BY_PACKAGE: Record<string, ImageSourcePropType> = {
  'com.mobile.legends': require('../../../assets/images/apps/mobilelegends.png'),
  'com.zhiliaoapp.musically': require('../../../assets/images/apps/tiktok.png'),
  'com.ss.android.ugc.trill': require('../../../assets/images/apps/tiktok.png'),
  'com.instagram.android': require('../../../assets/images/apps/instagram.png'),
  'com.facebook.katana': require('../../../assets/images/apps/facebook.png'),
  'com.facebook.lite': require('../../../assets/images/apps/facebook.png'),
  'com.twitter.android': require('../../../assets/images/apps/twitter.png'),
  'com.facebook.orca': require('../../../assets/images/apps/messenger.png'),
  'com.facebook.mlite': require('../../../assets/images/apps/messenger.png'),
  'com.whatsapp': require('../../../assets/images/apps/whatsapp.png'),
  'org.telegram.messenger': require('../../../assets/images/apps/telegram.png'),
  'com.google.android.googlequicksearchbox': require('../../../assets/images/apps/google.png'),
  'com.android.chrome': require('../../../assets/images/apps/chrome.png'),
};

const BY_LABEL: Record<string, string> = {
  'mobile legends': 'com.mobile.legends',
  tiktok: 'com.zhiliaoapp.musically',
  instagram: 'com.instagram.android',
  facebook: 'com.facebook.katana',
  twitter: 'com.twitter.android',
  x: 'com.twitter.android',
  messenger: 'com.facebook.orca',
  whatsapp: 'com.whatsapp',
  telegram: 'org.telegram.messenger',
  google: 'com.google.android.googlequicksearchbox',
  chrome: 'com.android.chrome',
};

export function appIcon(pkg: string | null | undefined, label?: string | null): ImageSourcePropType | null {
  if (pkg && BY_PACKAGE[pkg]) return BY_PACKAGE[pkg];
  const k = label ? BY_LABEL[label.trim().toLowerCase()] : undefined;
  return k ? BY_PACKAGE[k] : null;
}
