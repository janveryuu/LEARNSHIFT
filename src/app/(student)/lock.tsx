import { useEffect, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, HourglassMedium, Phone } from 'phosphor-react-native';

import { Tarsi } from '@/components/mascot/Tarsi';
import { DevChip, PillButton, Ring, Text } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { useLive } from '@/hooks/useLive';
import { formatClock, formatDuration, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

export default function LockScreen() {
  return (
    <ThemeProvider mode="night">
      <Lock />
    </ThemeProvider>
  );
}

function Lock() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const live = useLive();
  const bedtime = useAppStore((s) => s.bedtime);
  const guardian = useAppStore((s) => s.guardian);
  const lockRequestId = useSession((s) => s.lockRequestId);
  const fresh = useAppStore((s) => s.requests.find((r) => r.id === lockRequestId) ?? null);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    useAppStore.getState().logNudge('lock', live.risk.reasons, 'locked');
  }, [live.risk.reasons]);

  // Minutes from now until the bedtime window ends.
  const total = (bedtime.end - bedtime.start + 1440) % 1440 || 1440;
  const leftMin = (bedtime.end - live.clock + 1440) % 1440;
  const progress = Math.max(0, Math.min(1, leftMin / total));

  return (
    <View
      style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.demo}>
        <DevChip label={t.demo.title} onPress={() => router.push('/demo')} />
      </View>
      <View style={styles.center}>
        <Ring
          progress={progress}
          size={260}
          stroke={12}
          color={c.indigo}
          accessibilityLabel={t.lock.until(formatClock(bedtime.end))}
        >
          <Tarsi expression="sleepy" size={110} alive />
          <Text variant="statNumber" tabular>
            {formatDuration(leftMin)}
          </Text>
        </Ring>
        <Text variant="largeTitle" align="center" style={styles.until}>
          {t.lock.until(formatClock(bedtime.end))}
        </Text>
        <Text variant="subhead" align="center">
          {t.lock.setBy(guardian.name)} · {t.lock.rest}
        </Text>
      </View>

      <View style={styles.actions}>
        {fresh?.status === 'approved' ? (
          <View style={styles.status}>
            <CheckCircle size={22} weight="fill" color={c.success} />
            <Text variant="headline" color="success">
              {t.lock.approved}
            </Text>
          </View>
        ) : fresh?.status === 'declined' ? (
          <Text variant="headline" align="center">
            {t.lock.declined}
          </Text>
        ) : fresh ? (
          <View style={styles.status}>
            <HourglassMedium size={20} weight="fill" color={c.accent} />
            <View>
              <Text variant="headline">{t.lock.sent}</Text>
              <Text variant="caption">{t.lock.sentSub(guardian.name)}</Text>
            </View>
          </View>
        ) : null}

        {fresh?.status === 'approved' ? (
          <PillButton label={t.common.continue} size="lg" block onPress={() => router.dismissTo('/home')} />
        ) : (
          <PillButton
            label={t.lock.ask(guardian.name)}
            kind="secondary"
            size="lg"
            block
            disabled={!!fresh}
            onPress={() => useSession.getState().setLockRequestId(useAppStore.getState().requestTime())}
          />
        )}
        <PillButton
          label={t.lock.emergency}
          kind="neutral"
          size="lg"
          block
          icon={<Phone size={18} weight="fill" color={c.text} />}
          onPress={() => Linking.openURL('tel:911').catch(() => {})}
        />
        <Text variant="caption" align="center">
          {t.lock.calling}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.screen, justifyContent: 'space-between' },
  demo: { alignSelf: 'flex-end' },
  center: { alignItems: 'center', gap: 6 },
  until: { marginTop: 18 },
  actions: { gap: 10, width: '100%', maxWidth: 480, alignSelf: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 44 },
});
