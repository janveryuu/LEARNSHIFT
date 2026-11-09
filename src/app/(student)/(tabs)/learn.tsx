import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Play } from 'phosphor-react-native';

import { SkillGraph } from '@/components/learn/SkillGraph';
import { Screen } from '@/components/student/Screen';
import { BooksArt, FeedArt, TutorArt } from '@/components/student/TileArt';
import {
  Card,
  Chip,
  DarkTile,
  LargeTitleHeader,
  ListGroup,
  ListRow,
  PressableScale,
  ProgressBar,
  SegmentedControl,
  Stagger,
  Text,
} from '@/components/ui';
import { lessonFor } from '@/data/lessons';
import { SKILL_BY_ID, SKILLS } from '@/data/skills';
import { pressScale } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useLive } from '@/hooks/useLive';
import { useL, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

type Seg = 'you' | 'skills';
const FEED_CAP = 15;

export default function Learn() {
  const t = useT();
  const { seg } = useLocalSearchParams<{ seg?: string }>();
  const [tab, setTab] = useState<Seg>(seg === 'skills' ? 'skills' : 'you');
  const [lastSeg, setLastSeg] = useState(seg);
  if (seg !== lastSeg) {
    setLastSeg(seg);
    if (seg === 'skills' || seg === 'you') setTab(seg);
  }

  return (
    <Screen tabs header={<LargeTitleHeader title={t.learn.title} />}>
      <SegmentedControl<Seg>
        options={[
          { value: 'you', label: t.learn.forYou },
          { value: 'skills', label: t.learn.skills },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.seg}
      />
      {tab === 'you' ? <ForYou /> : <Skills />}
    </Screen>
  );
}

function ForYou() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const live = useLive();
  const feed = useAppStore((s) => s.feed);
  const offline = useAppStore((s) => s.offline);
  const lesson = lessonFor(live.root);
  const used = feed.day === new Date().toISOString().slice(0, 10) ? Math.round(feed.minutes) : 0;

  return (
    <>
      <Stagger index={0}>
        <Card
          onPress={() => router.push({ pathname: '/break/[id]', params: { id: live.root } })}
          style={styles.continue}
          accessibilityLabel={t.learn.continue}
        >
          <View style={styles.flexGap}>
            <Text variant="overline">{t.learn.continue}</Text>
            <Text variant="title">{L(SKILL_BY_ID[lesson.id].name)}</Text>
            <Text variant="subhead" numberOfLines={1}>
              {L(lesson.concepts[1].text)}
            </Text>
            <ProgressBar progress={0.34} style={styles.mt} accessibilityLabel={t.brk.concept(1, 3)} />
          </View>
          <View style={[styles.play, { backgroundColor: c.accent }]}>
            <Play size={22} weight="fill" color={c.onAccent} />
          </View>
        </Card>
      </Stagger>

      <Stagger index={1}>
        <PressableScale
          scaleTo={pressScale.card}
          onPress={() => router.push('/feed')}
          accessibilityLabel={`${t.learn.openFeed}, ${t.learn.feedCap(used, FEED_CAP)}`}
          style={[styles.feed, { backgroundColor: c.tileDark }]}
        >
          <View style={styles.feedArt} pointerEvents="none">
            <FeedArt size={130} />
          </View>
          <View style={styles.feedText}>
            <Text variant="title" color={c.tileDarkText}>
              {t.learn.openFeed}
            </Text>
            <Text variant="subhead" color={c.tileDarkSecondary}>
              {t.learn.feedSub}
            </Text>
          </View>
          <View style={styles.feedMeter}>
            <Text variant="subhead" color={c.tileDarkText} tabular>
              {t.learn.feedCap(used, FEED_CAP)}
            </Text>
            <ProgressBar progress={Math.min(1, used / FEED_CAP)} color={c.spark} style={styles.darkTrack} />
          </View>
        </PressableScale>
      </Stagger>

      <Stagger index={2} style={styles.row}>
        <DarkTile
          title={t.learn.askTutor}
          status={t.learn.tutorStatus}
          style={styles.flex}
          onPress={() => router.push('/tutor')}
          art={<TutorArt />}
        />
        <DarkTile
          title={t.learn.offline}
          status={t.learn.offlineStatus(offline.length)}
          statusAccent
          style={styles.flex}
          onPress={() => router.push('/offline')}
          art={<BooksArt />}
        />
      </Stagger>
    </>
  );
}

function Skills() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const live = useLive();
  const mastery = useAppStore((s) => s.mastery);
  const { width } = useWindowDimensions();
  const graphW = Math.min(width, 560) - space.screen * 2 - space.card * 2;
  const sorted = [...SKILLS].sort((a, b) => mastery[a.id] - mastery[b.id]);
  const open = (id: string) => router.push({ pathname: '/skill/[id]', params: { id } });

  return (
    <>
      <Stagger index={0}>
        <Card style={styles.gap}>
          <View style={styles.rowBetween}>
            <View>
              <Text variant="title">{t.learn.mapTitle}</Text>
              <Text variant="subhead">{t.learn.mapSub}</Text>
            </View>
            <Chip label={`${t.learn.rootGap}: ${L(SKILL_BY_ID[live.root].name)}`} kind="accent" />
          </View>
          <SkillGraph mastery={mastery} root={live.root} blocked={live.blocked} width={graphW} onPress={open} />
          <View style={styles.legend}>
            {[
              [c.accentFaded, t.learn.legendLow],
              [c.warning, '50%+'],
              [c.success, t.learn.legendHigh],
            ].map(([col, label]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: col }]} />
                <Text variant="caption">{label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Stagger>
      <Stagger index={1}>
        <ListGroup>
          {sorted.map((s) => (
            <ListRow
              key={s.id}
              title={L(s.name)}
              value={`${Math.round(mastery[s.id] * 100)}%`}
              onPress={() => open(s.id)}
            />
          ))}
        </ListGroup>
      </Stagger>
    </>
  );
}

const styles = StyleSheet.create({
  seg: { marginTop: 8, marginBottom: 4 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 2 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', gap: space.gap },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  mt: { marginTop: 10 },
  continue: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  feed: {
    borderRadius: radius.tile,
    borderCurve: 'continuous',
    padding: 18,
    minHeight: 190,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  feedArt: { position: 'absolute', right: -14, top: -6 },
  feedText: { gap: 2, maxWidth: '62%' },
  feedMeter: { gap: 8, maxWidth: '70%' },
  darkTrack: { backgroundColor: 'rgba(255,255,255,0.12)' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
