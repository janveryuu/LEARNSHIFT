import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowDown, CaretLeft, Check, WifiSlash } from 'phosphor-react-native';

import { Screen } from '@/components/student/Screen';
import { Card, LargeTitleHeader, NavBar, PillButton, Ring, Stagger, Text } from '@/components/ui';
import { OFFLINE_PACKS } from '@/data/lessons';
import { SKILL_BY_ID, type SkillId } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useL, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

/** Lesson packs per skill for learners with limited data. Downloads are mocked. */
export default function Offline() {
  const { c } = useTheme();
  const t = useT();
  const saved = useAppStore((s) => s.offline);
  const used = OFFLINE_PACKS.filter((p) => saved.includes(p.skill)).reduce((a, p) => a + p.mb, 0);

  return (
    <Screen
      header={
        <NavBar
          onBack={() => router.back()}
          backIcon={<CaretLeft size={20} weight="bold" color={c.text} />}
          backLabel={t.common.back}
        />
      }
    >
      <LargeTitleHeader title={t.offline.title} style={styles.title} />
      <Stagger index={0}>
        <Card style={styles.summary}>
          <View style={[styles.icon, { backgroundColor: c.accentTint }]}>
            <WifiSlash size={22} weight="fill" color={c.accent} />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">{t.offline.sub}</Text>
            <Text variant="subhead" tabular>
              {t.offline.storage(Math.round(used * 10) / 10)}
            </Text>
          </View>
        </Card>
      </Stagger>
      {OFFLINE_PACKS.map((p, i) => (
        <Stagger key={p.skill} index={i + 1}>
          <PackRow skill={p.skill} mb={p.mb} lessons={p.lessons} saved={saved.includes(p.skill)} />
        </Stagger>
      ))}
    </Screen>
  );
}

function PackRow({ skill, mb, lessons, saved }: { skill: SkillId; mb: number; lessons: number; saved: boolean }) {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  // Mocked download: progress ticks up, then the pack is saved.
  const download = () => {
    let p = 0.02;
    setProgress(p);
    timer.current = setInterval(() => {
      p = Math.min(1, p + 0.08 + Math.random() * 0.1);
      if (p < 1) {
        setProgress(p);
        return;
      }
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      haptic.success();
      useAppStore.getState().toggleOffline(skill);
      setProgress(null);
    }, 140);
  };

  return (
    <Card style={styles.row}>
      <Ring progress={progress ?? (saved ? 1 : 0)} size={46} stroke={5} color={saved ? c.success : c.accent}>
        {saved && progress == null ? (
          <Check size={18} weight="bold" color={c.success} />
        ) : (
          <ArrowDown size={18} weight="bold" color={progress != null ? c.accent : c.textTertiary} />
        )}
      </Ring>
      <View style={styles.flex}>
        <Text variant="headline">{L(SKILL_BY_ID[skill].name)}</Text>
        <Text variant="subhead">
          {t.offline.lessons(lessons)} · {t.offline.size(mb)}
        </Text>
      </View>
      {saved ? (
        <PillButton
          label={t.offline.remove}
          kind="neutral"
          size="sm"
          onPress={() => useAppStore.getState().toggleOffline(skill)}
        />
      ) : (
        <PillButton
          label={progress != null ? `${Math.round(progress * 100)}%` : t.offline.get}
          size="sm"
          disabled={progress != null}
          onPress={download}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { paddingHorizontal: 0, marginBottom: 8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 46, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
});
