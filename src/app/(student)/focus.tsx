import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellSlash, CaretLeft } from 'phosphor-react-native';

import { Paty } from '@/components/mascot/Paty';
import { Chip, NavBar, PillButton, Ring, Stepper, Text } from '@/components/ui';
import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

type State = 'setup' | 'running' | 'paused' | 'done';

/** Student-started study timer. Nudges pause; coins on completion. */
export default function Focus() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [mins, setMins] = useState(25);
  const [state, setState] = useState<State>('setup');
  const [left, setLeft] = useState(25 * 60);
  const reward = Math.round(mins / 5) * 3;

  const complete = () => {
    haptic.success();
    useSession.getState().setFocusUntil(null);
    useAppStore.getState().addCoins(reward);
    setLeft(0);
    setState('done');
  };

  // The clock runs against an end timestamp, so a paused JS thread never drifts it.
  useEffect(() => {
    if (state !== 'running') return;
    const endAt = Date.now() + left * 1000;
    useSession.getState().setFocusUntil(endAt);
    const id = setInterval(() => {
      const remain = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(remain);
      if (remain === 0) {
        clearInterval(id);
        complete();
      }
    }, 250);
    return () => clearInterval(id);
    // Restart only when the run state changes, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => () => useSession.getState().setFocusUntil(null), []);

  const total = mins * 60;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <NavBar
        onBack={() => router.back()}
        backIcon={<CaretLeft size={20} weight="bold" color={c.text} />}
        backLabel={t.common.back}
        title={t.focus.title}
      />
      <View style={styles.center}>
        {/* Long-press the ring to finish instantly during a live demo. */}
        <Pressable
          onLongPress={() => state !== 'setup' && state !== 'done' && complete()}
          delayLongPress={800}
          accessibilityLabel={`${mm}:${ss} ${t.focus.left}`}
        >
          <Ring
            progress={state === 'setup' ? 1 : left / total}
            size={270}
            stroke={14}
            color={state === 'done' ? c.success : c.tabProfile}
          >
            <Paty
              expression={state === 'done' ? 'cheering' : 'studying'}
              prop={state === 'done' ? 'none' : 'book'}
              size={120}
            />
            <Text variant="display" tabular style={styles.time}>
              {state === 'setup' ? `${mins}:00` : `${mm}:${ss}`}
            </Text>
          </Ring>
        </Pressable>
        {state === 'running' || state === 'paused' ? (
          <Chip label={t.focus.paused} kind="tinted" icon={<BellSlash size={14} weight="fill" color={c.accent} />} />
        ) : null}
        {state === 'done' ? (
          <View style={styles.doneText}>
            <Text variant="title">{t.focus.done}</Text>
            <View style={[styles.earn, { backgroundColor: c.accentTint }]}>
              <Text variant="headline" color="accent">
                {t.focus.earned(reward)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        {state === 'setup' ? (
          <>
            <Stepper
              label={t.focus.minutes}
              value={mins}
              onChange={(v) => {
                setMins(v);
                setLeft(v * 60);
              }}
              unit={t.common.min}
              min={5}
              max={60}
              step={5}
            />
            <PillButton label={t.focus.start} size="lg" block onPress={() => setState('running')} />
          </>
        ) : state === 'done' ? (
          <View style={styles.row}>
            <PillButton
              label={t.focus.again}
              kind="secondary"
              size="lg"
              style={styles.flex}
              block
              onPress={() => {
                setLeft(mins * 60);
                setState('setup');
              }}
            />
            <PillButton label={t.common.done} size="lg" style={styles.flex} block onPress={() => router.back()} />
          </View>
        ) : (
          <View style={styles.row}>
            <PillButton
              label={state === 'running' ? t.focus.pause : t.focus.resume}
              kind="secondary"
              size="lg"
              style={styles.flex}
              block
              onPress={() => setState(state === 'running' ? 'paused' : 'running')}
            />
            <PillButton
              label={t.focus.end}
              kind="neutral"
              size="lg"
              style={styles.flex}
              block
              onPress={() => {
                useSession.getState().setFocusUntil(null);
                setLeft(mins * 60);
                setState('setup');
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  time: { fontSize: 44, lineHeight: 48 },
  doneText: { alignItems: 'center', gap: 8 },
  earn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill },
  footer: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: space.gap },
});
