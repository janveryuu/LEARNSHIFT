import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play } from 'phosphor-react-native';

import {
  Card,
  ListGroup,
  ListRow,
  PressableScale,
  RiskChip,
  SegmentedControl,
  SheetHeader,
  Slider,
  Text,
  Toggle,
} from '@/components/ui';
import { pressScale } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useLive } from '@/hooks/useLive';
import { formatClock, useT } from '@/i18n/useT';
import { runScenario, type ScenarioId } from '@/services/demo';
import { useAppStore, type Lang, type Role, type ThemePref } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

export default function Demo() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const live = useLive();
  const demo = useAppStore((s) => s.demo);
  const role = useAppStore((s) => s.role);
  const lang = useAppStore((s) => s.lang);
  const themePref = useAppStore((s) => s.themePref);
  const setDemo = useAppStore((s) => s.setDemo);
  const [confirm, setConfirm] = useState(false);

  const scenarios: { id: ScenarioId; title: string; sub: string }[] = [
    { id: 1, title: t.demo.s1, sub: t.demo.s1Sub },
    { id: 2, title: t.demo.s2, sub: t.demo.s2Sub },
    { id: 3, title: t.demo.s3, sub: t.demo.s3Sub },
    { id: 4, title: t.demo.s4, sub: t.demo.s4Sub },
  ];

  const switchRole = (r: Role) => {
    const s = useAppStore.getState();
    s.setRole(r);
    useSession.getState().setShiftOpen(false);
    router.dismissTo(r === 'student' ? '/home' : r === 'guardian' ? '/guardian' : '/teacher');
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SheetHeader title={t.demo.title} right={{ label: t.common.done, onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="overline" style={styles.label}>
          {t.demo.scenarios}
        </Text>
        <View style={styles.grid}>
          {scenarios.map((s) => (
            <PressableScale
              key={s.id}
              scaleTo={pressScale.card}
              onPress={() => runScenario(s.id)}
              accessibilityLabel={`${s.id}. ${s.title}. ${s.sub}`}
              style={[styles.scenario, { backgroundColor: c.tileDark }]}
            >
              <View style={styles.scenarioHead}>
                <View style={[styles.num, { backgroundColor: c.accent }]}>
                  <Text variant="subhead" color="onAccent">
                    {s.id}
                  </Text>
                </View>
                <Play size={18} weight="fill" color={c.tileDarkSecondary} />
              </View>
              <Text variant="headline" color={c.tileDarkText} numberOfLines={2}>
                {s.title}
              </Text>
              <Text variant="caption" color={c.tileDarkSecondary} numberOfLines={1}>
                {s.sub}
              </Text>
            </PressableScale>
          ))}
        </View>

        <Text variant="overline" style={styles.label}>
          {t.demo.controls}
        </Text>
        <Card style={styles.gap}>
          <View style={styles.rowBetween}>
            <Text variant="headline">{t.demo.clock}</Text>
            <View style={styles.inline}>
              <Text variant="headline" color="accent" tabular>
                {formatClock(live.clock)}
              </Text>
              <Text variant="subhead">{t.demo.live}</Text>
              <Toggle
                value={demo.clock == null}
                onChange={(v) => setDemo({ clock: v ? null : live.clock })}
                accessibilityLabel={t.demo.live}
              />
            </View>
          </View>
          <Slider
            value={live.clock}
            min={0}
            max={1425}
            step={15}
            onChange={(v) => setDemo({ clock: v })}
            accessibilityLabel={t.demo.clock}
            accessibilityValueText={formatClock(live.clock)}
          />
          <View style={[styles.rowBetween, styles.hair, { borderColor: c.hairline }]}>
            <Text variant="headline">{t.demo.schoolDay}</Text>
            <Toggle
              value={live.schoolDay}
              onChange={(v) => setDemo({ schoolDay: v })}
              accessibilityLabel={t.demo.schoolDay}
            />
          </View>
          <View style={[styles.rowBetween, styles.hair, { borderColor: c.hairline }]}>
            <Text variant="headline">{t.demo.risk}</Text>
            <View style={styles.inline}>
              <RiskChip level={live.risk.level} />
              <Text variant="headline" tabular>
                {live.risk.risk.toFixed(2)}
              </Text>
            </View>
          </View>
          <Slider
            value={Math.round(live.risk.risk * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => setDemo({ risk: v / 100 })}
            accessibilityLabel={t.demo.risk}
          />
          <View style={styles.rowBetween}>
            <Text variant="subhead">{t.demo.auto}</Text>
            <Toggle
              value={demo.risk == null}
              onChange={(v) => setDemo({ risk: v ? null : live.risk.risk })}
              accessibilityLabel={t.demo.auto}
            />
          </View>
        </Card>

        <Card style={styles.gap}>
          <Text variant="overline">{t.demo.role}</Text>
          <SegmentedControl<Role>
            options={[
              { value: 'student', label: t.demo.student },
              { value: 'guardian', label: t.demo.guardian },
              { value: 'teacher', label: t.demo.teacher },
            ]}
            value={role}
            onChange={switchRole}
          />
          <Text variant="overline">{t.demo.language}</Text>
          <SegmentedControl<Lang>
            options={[
              { value: 'en', label: 'English' },
              { value: 'fil', label: 'Filipino' },
            ]}
            value={lang}
            onChange={(l) => useAppStore.getState().setLang(l)}
          />
          <Text variant="overline">{t.demo.theme}</Text>
          <SegmentedControl<ThemePref>
            options={[
              { value: 'auto', label: t.profile.auto },
              { value: 'day', label: t.profile.day },
              { value: 'night', label: t.profile.night },
            ]}
            value={themePref}
            onChange={(p) => useAppStore.getState().setThemePref(p)}
          />
        </Card>

        <ListGroup>
          <ListRow
            title={t.demo.onboarding}
            onPress={() => {
              useAppStore.getState().setOnboarded(false);
              router.dismissTo('/onboarding');
            }}
          />
          <ListRow title={t.demo.gallery} onPress={() => router.push('/dev/gallery')} />
          <ListRow
            title={confirm ? t.demo.resetConfirm : t.demo.reset}
            destructive
            chevron={false}
            onPress={() => {
              if (!confirm) {
                setConfirm(true);
                return;
              }
              useAppStore.getState().reset();
              useSession.getState().setSimMinutes(0);
              setConfirm(false);
              router.dismissTo('/home');
            }}
          />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 640, alignSelf: 'center' },
  label: { marginLeft: 4, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  scenario: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.tile, padding: 16, gap: 6, minHeight: 128 },
  scenarioHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gap: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hair: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
});
