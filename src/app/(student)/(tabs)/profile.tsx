import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FileText, Info, Lifebuoy, ListChecks, ShieldCheck, UserCircle } from 'phosphor-react-native';

import { PatyAvatar } from '@/components/mascot/Paty';
import { Screen } from '@/components/student/Screen';
import { BooksArt, LanguageArt, MoonArt, ShieldArt } from '@/components/student/TileArt';
import { Card, DarkTile, LargeTitleHeader, ListGroup, ListRow, SegmentedControl, Stagger, Text } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { formatClock, useT } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
import { useAuth } from '@/store/useAuth';
import { useAppStore, type ThemePref } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

export default function Profile() {
  const { c } = useTheme();
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const bedtime = useAppStore((s) => s.bedtime);
  const guardian = useAppStore((s) => s.guardian);
  const offline = useAppStore((s) => s.offline);
  const themePref = useAppStore((s) => s.themePref);
  const nudges = useAppStore((s) => s.nudges.length);
  const [confirm, setConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);
  const name = useAppStore((s) => s.studentName);
  const classes = useAppStore((s) => s.classes);
  const grade = useAuth((s) => s.profile?.grade ?? null);
  const pitchGrade = IS_PITCH ? 8 : grade;

  let i = 0;
  return (
    <Screen tabs header={<LargeTitleHeader title={t.profile.title} />}>
      <Stagger index={i++}>
        <Card style={styles.me}>
          <PatyAvatar size={58} />
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="subhead">{t.profile.grade(pitchGrade, classes[0]?.name ?? '')}</Text>
          </View>
        </Card>
      </Stagger>

      <Stagger index={i++} style={styles.grid}>
        <DarkTile
          title={t.profile.bedtime}
          status={formatClock(bedtime.start)}
          style={styles.tile}
          onPress={() => router.push('/bedtime')}
          art={<MoonArt />}
        />
        <DarkTile
          title={t.profile.language}
          status={lang === 'en' ? t.common.english : t.common.filipino}
          style={styles.tile}
          onPress={() => useAppStore.getState().setLang(lang === 'en' ? 'fil' : 'en')}
          art={<LanguageArt />}
        />
        <DarkTile
          title={t.profile.guardian}
          status={guardian.linked ? `${t.profile.linked} · ${guardian.name}` : t.acct.linkTitle}
          statusAccent
          style={styles.tile}
          onPress={() => router.push(IS_PITCH ? '/privacy' : '/account')}
          art={<ShieldArt />}
        />
        <DarkTile
          title={t.profile.offline}
          status={t.learn.offlineStatus(offline.length)}
          style={styles.tile}
          onPress={() => router.push('/offline')}
          art={<BooksArt />}
        />
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.gap}>
          <Text variant="headline">{t.profile.appearance}</Text>
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
      </Stagger>

      <Stagger index={i++}>
        <ListGroup>
          {!IS_PITCH ? (
            <ListRow
              title="Account"
              icon={<UserCircle size={20} weight="fill" color={c.accent} />}
              onPress={() => router.push('/account')}
            />
          ) : null}
          <ListRow
            title={t.profile.privacy}
            icon={<ShieldCheck size={20} weight="fill" color={c.success} />}
            onPress={() => router.push('/privacy')}
          />
          <ListRow
            title={t.profile.nudges}
            value={String(nudges)}
            icon={<ListChecks size={20} weight="fill" color={c.accent} />}
            onPress={() => router.push('/nudges')}
          />
          <ListRow
            title={t.profile.help}
            icon={<Lifebuoy size={20} weight="fill" color={c.tabInsights} />}
            onPress={() => router.push('/tutor')}
          />
          <ListRow
            title={t.profile.terms}
            icon={<FileText size={20} weight="fill" color={c.textSecondary} />}
            onPress={() => router.push('/privacy')}
          />
          <ListRow
            title={t.profile.version}
            value="1.0.0"
            icon={<Info size={20} weight="fill" color={c.textSecondary} />}
            chevron={false}
          />
        </ListGroup>
      </Stagger>

      <Stagger index={i++}>
        <ListGroup>
          <ListRow
            title={IS_PITCH ? (cleared ? t.profile.delDone : confirm ? t.profile.delConfirm : t.profile.del) : t.profile.del}
            destructive
            chevron={false}
            onPress={() => {
              if (!IS_PITCH) {
                router.push('/account');
                return;
              }
              if (!confirm) {
                setConfirm(true);
                return;
              }
              useAppStore.getState().reset();
              useSession.getState().setSimMinutes(0);
              setConfirm(false);
              setCleared(true);
            }}
          />
        </ListGroup>
      </Stagger>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  tile: { flexBasis: '47%', flexGrow: 1 },
});
