import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { AppWindow, BatteryCharging, BellRinging, CheckCircle, Eye, Stack } from 'phosphor-react-native';

import { Card, PillButton, Text } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useT } from '@/i18n/useT';
import {
  openBatterySettings,
  openNotificationSettings,
  openOverlaySettings,
  platform,
  requestAccess,
  status,
  type MonitorStatus,
} from '@/services/monitor';
import { useDevice } from '@/services/monitor/bridge';

import { AppPicker } from './AppPicker';

const BRANDS: Record<string, string> = {
  xiaomi: 'Xiaomi',
  redmi: 'Xiaomi',
  poco: 'Xiaomi',
  oppo: 'OPPO',
  realme: 'realme',
  vivo: 'vivo',
  huawei: 'Huawei',
  honor: 'Honor',
  infinix: 'Infinix',
  tecno: 'TECNO',
  itel: 'itel',
  oneplus: 'OnePlus',
};

/** Re-reads permission state whenever the app comes back from Settings. */
export function useMonitorStatus(): [MonitorStatus, () => void] {
  const [s, set] = useState(status);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        set(status());
        useDevice.getState().refresh();
      }
    });
    return () => sub.remove();
  }, []);
  return [s, () => set(status())];
}

function Step({
  icon,
  title,
  sub,
  done,
  optional,
  onPress,
  label,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  done: boolean;
  optional?: boolean;
  onPress: () => void;
  label: string;
}) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={[styles.step, { backgroundColor: c.inset }]}>
      <View style={[styles.icon, { backgroundColor: done ? c.accentTint : c.card }]}>{icon}</View>
      <View style={styles.flex}>
        <Text variant="headline">{title}</Text>
        <Text variant="caption">
          {optional ? `${t.acct.optional} · ` : ''}
          {sub}
        </Text>
      </View>
      {done ? (
        <View style={styles.done} accessibilityLabel={t.acct.on}>
          <CheckCircle size={26} weight="fill" color={c.success} />
        </View>
      ) : (
        <PillButton label={label} size="sm" onPress={onPress} />
      )}
    </View>
  );
}

/** The permissions doomscroll detection needs, per platform, with live state. */
export function MonitorSetup() {
  const t = useT();
  const { c } = useTheme();
  const [s, recheck] = useMonitorStatus();
  const [picking, setPicking] = useState(false);

  if (platform === 'none') {
    return (
      <Card>
        <Text variant="body" color="textSecondary">
          {t.acct.usageWeb}
        </Text>
      </Card>
    );
  }

  if (platform === 'ios') {
    return (
      <Card style={styles.gap}>
        <Text variant="subhead">{t.acct.usageIos}</Text>
        <Step
          icon={<Eye size={20} weight="fill" color={c.accent} />}
          title={t.acct.setupScreenTime}
          sub={t.acct.setupScreenTimeSub}
          done={s.access}
          label={t.acct.allow}
          onPress={() => requestAccess().then(recheck)}
        />
        <Step
          icon={<Stack size={20} weight="fill" color={c.accent} />}
          title={t.acct.setupPick}
          sub={s.apps > 0 ? t.acct.appsPicked(s.apps) : t.acct.setupPickSub}
          done={s.apps > 0}
          label={t.acct.pickApps}
          onPress={() => (s.access ? setPicking(true) : requestAccess().then(recheck))}
        />
        <AppPicker
          visible={picking}
          onClose={() => {
            setPicking(false);
            recheck();
          }}
          onPicked={recheck}
        />
      </Card>
    );
  }

  const brand = BRANDS[s.brand] ?? null;
  return (
    <Card style={styles.gap}>
      <Text variant="subhead">{t.acct.usageAndroid}</Text>
      <Step
        icon={<AppWindow size={20} weight="fill" color={c.accent} />}
        title={t.acct.setupUsage}
        sub={t.acct.setupUsageSub}
        done={s.access}
        label={t.acct.openSettings}
        onPress={() => requestAccess()}
      />
      <Step
        icon={<BellRinging size={20} weight="fill" color={c.accent} />}
        title={t.acct.setupNotify}
        sub={t.acct.setupNotifySub}
        done={s.notifications}
        label={t.acct.fix}
        onPress={openNotificationSettings}
      />
      <Step
        icon={<Stack size={20} weight="fill" color={c.accent} />}
        title={t.acct.setupOverlay}
        sub={t.acct.setupOverlaySub}
        done={s.overlay}
        optional
        label={t.acct.allow}
        onPress={openOverlaySettings}
      />
      <Step
        icon={<BatteryCharging size={20} weight="fill" color={c.accent} />}
        title={t.acct.setupBattery}
        sub={t.acct.setupBatterySub}
        done={s.battery}
        optional
        label={t.acct.allow}
        onPress={openBatterySettings}
      />
      {brand ? (
        <Text variant="caption" style={styles.tip}>
          {t.acct.brandTip(brand)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  gap: { gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.inset },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  done: { width: 44, alignItems: 'center' },
  tip: { paddingHorizontal: 4 },
});
