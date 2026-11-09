import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timer, BookOpenText, Lightning, Moon, ShieldCheck, Sparkle, Translate } from 'phosphor-react-native';

import { IslaScene } from '@/components/isla/IslaScene';
import { Diagram } from '@/components/learn/Diagram';
import { QuizOption } from '@/components/learn/QuizOption';
import { SkillGraph } from '@/components/learn/SkillGraph';
import { BooksArt, FeedArt, LanguageArt, MoonArt, ShieldArt, TutorArt } from '@/components/student/TileArt';
import { Tarsi, type Expression } from '@/components/mascot/Tarsi';
import { TarsiSpark } from '@/components/mascot/TarsiSpark';
import {
  BottomSheet,
  BarChart,
  Card,
  Chip,
  CoinCounter,
  DarkTile,
  DevChip,
  EmptyState,
  Heatmap,
  InsetCard,
  LargeTitleHeader,
  ListGroup,
  ListRow,
  PillButton,
  ProgressBar,
  RiskChip,
  Ring,
  SegmentedControl,
  SheetHeader,
  Skeleton,
  Slider,
  SparkCount,
  Stagger,
  StatTile,
  Stepper,
  StreakRow,
  TabBar,
  Text,
  TickGauge,
  Toggle,
  WheelGroup,
  WheelPicker,
  type StreakDay,
  type TabKey,
} from '@/components/ui';
import { ThemeProvider, useTheme, type Mode } from '@/design/theme';
import { space } from '@/design/tokens';
import { SEED_BUILT } from '@/data/seed';
import { MIKA_MASTERY } from '@/data/skills';
import type { Variant } from '@/design/typography';

type View3 = 'day' | 'night' | 'both';

export default function Gallery() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { mode } = useLocalSearchParams<{ mode?: View3 }>();
  const [view, setView] = useState<View3>(mode ?? (wide ? 'both' : 'day'));
  const [run, setRun] = useState(0);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const modes: Mode[] = view === 'both' ? ['day', 'night'] : [view];

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <LargeTitleHeader title="Gallery" action={{ label: 'Replay', onPress: () => setRun((r) => r + 1) }} />
      <View style={styles.switcher}>
        <SegmentedControl<View3>
          options={[
            { value: 'day', label: 'Day' },
            { value: 'night', label: 'Night' },
            ...(wide ? [{ value: 'both' as const, label: 'Side by side' }] : []),
          ]}
          value={view}
          onChange={setView}
        />
      </View>
      <View style={styles.columns}>
        {modes.map((m) => (
          <ThemeProvider key={m + run} mode={m}>
            <Column />
          </ThemeProvider>
        ))}
      </View>
    </View>
  );
}

const heat = Array.from({ length: 22 * 7 }, (_, i) => {
  const seed = Math.sin(i * 12.9898) * 43758.5453;
  const r = seed - Math.floor(seed);
  if (i > 22 * 7 - 4) return 0;
  if (i < 40) return r > 0.75 ? 1 : 0;
  return r > 0.82 ? 4 : r > 0.6 ? 3 : r > 0.42 ? 2 : r > 0.3 ? 1 : 0;
});

const streak: StreakDay[] = [
  { state: 'done', info: 'Sun · 2 breaks · off at 9:40 PM' },
  { state: 'done', info: 'Mon · 3 breaks · off at 10:04 PM' },
  { state: 'done', lateNight: true, info: 'Tue · 1 break · off at 11:52 PM' },
  { state: 'today', info: 'Today · 1 break so far' },
  { state: 'future' },
  { state: 'future' },
  { state: 'future' },
];

const expressions: Expression[] = [
  'happy',
  'curious',
  'proud',
  'concerned',
  'sleepy',
  'cheering',
  'studying',
  'waving',
];

const variantsList: { v: Variant; sample: string }[] = [
  { v: 'display', sample: '2h 14' },
  { v: 'largeTitle', sample: 'Insights' },
  { v: 'title', sample: 'Your little isla' },
  { v: 'headline', sample: 'Ready for 45 seconds?' },
  { v: 'body', sample: 'Fractions, your root gap' },
  { v: 'subhead', sample: 'of 3h · adapts to school day' },
  { v: 'caption', sample: '1,240 coins · grows every good day' },
  { v: 'overline', sample: 'Next break' },
  { v: 'statNumber', sample: '9/12' },
];

function Column() {
  const { c } = useTheme();
  const [seg, setSeg] = useState<'you' | 'skills'>('you');
  const [on, setOn] = useState(true);
  const [mins, setMins] = useState(25);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState(1);
  const [tab, setTab] = useState<TabKey>('home');
  const [shift, setShift] = useState(false);
  const [coins, setCoins] = useState(1240);
  const [gauge, setGauge] = useState(0.74);
  const [slide, setSlide] = useState(60);
  const [sheet, setSheet] = useState(false);

  let i = 0;
  const next = () => i++;

  return (
    <ScrollView
      style={[styles.col, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Section title="Type" index={next()}>
        <Card style={styles.gapSm}>
          {variantsList.map(({ v, sample }) => (
            <View key={v} style={styles.typeRow}>
              <Text variant="caption" style={styles.typeLabel}>
                {v}
              </Text>
              <Text variant={v} numberOfLines={1} style={styles.flex}>
                {sample}
              </Text>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Color" index={next()}>
        <Card>
          <View style={styles.swatches}>
            {(
              [
                'bg',
                'card',
                'inset',
                'tileDark',
                'text',
                'textSecondary',
                'accent',
                'accentTint',
                'spark',
                'success',
                'warning',
                'danger',
                'indigo',
                'tabHome',
                'tabLearn',
                'tabInsights',
                'tabProfile',
              ] as const
            ).map((k) => (
              <View key={k} style={styles.swatch}>
                <View style={[styles.swatchChip, { backgroundColor: c[k], borderColor: c.hairline }]} />
                <Text variant="caption" numberOfLines={1}>
                  {k}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <Section title="Hero card" index={next()}>
        <Card style={styles.gapMd}>
          <View style={styles.rowBetween}>
            <Text variant="headline">Today</Text>
            <RiskChip level="calm" />
          </View>
          <View style={styles.center}>
            <TickGauge progress={gauge} width={300} accessibilityLabel="2 hours 14 minutes of 3 hours">
              <View style={styles.heroNum}>
                <Text variant="display">2h 14</Text>
                <Text variant="displayUnit" style={styles.unit}>
                  m
                </Text>
              </View>
              <Text variant="subhead">of 3h · adapts to school day</Text>
            </TickGauge>
          </View>
          <View style={styles.row}>
            <InsetCard
              label="Next break"
              value="Fractions"
              chevron
              onPress={() => setGauge((g) => (g > 0.9 ? 0.2 : g + 0.15))}
              style={styles.flex}
            />
            <InsetCard label="Bedtime" value="10:00 PM" chevron onPress={() => {}} style={styles.flex} />
          </View>
        </Card>
      </Section>

      <Section title="Buttons & chips" index={next()}>
        <Card style={styles.gapMd}>
          <View style={styles.wrap}>
            <PillButton label="Start break" onPress={() => {}} />
            <PillButton label="5 more min" kind="secondary" onPress={() => {}} />
            <PillButton label="Open isla" soft onPress={() => {}} />
          </View>
          <View style={styles.wrap}>
            <PillButton label="Neutral" kind="neutral" size="sm" onPress={() => {}} />
            <PillButton label="Delete" kind="destructive" size="sm" onPress={() => {}} />
            <PillButton label="Disabled" disabled size="sm" onPress={() => {}} />
          </View>
          <PillButton label="Update bedtime" block size="lg" onPress={() => {}} />
          <View style={styles.wrap}>
            <DevChip onPress={() => {}} />
            <Chip label="Why?" kind="tinted" onPress={() => {}} />
            <Chip label="Simpler" onPress={() => {}} />
            <Chip label="Selected" selected onPress={() => {}} />
            <Chip label="Outline" kind="outline" />
          </View>
          <View style={styles.wrap}>
            <RiskChip level="calm" />
            <RiskChip level="long" />
            <RiskChip level="shift" />
            <RiskChip level="winddown" />
          </View>
        </Card>
      </Section>

      <Section title="Break card" index={next()}>
        <Card style={styles.breakCard}>
          <View style={styles.breakText}>
            <Text variant="headline">Ready for 45 seconds?</Text>
            <Text variant="subhead">Fractions, your root gap</Text>
            <PillButton label="Start break" size="md" onPress={() => {}} style={styles.mt8} />
          </View>
          <Tarsi expression="happy" prop="pencil" size={110} />
        </Card>
      </Section>

      <Section title="Dark tiles" index={next()}>
        <View style={styles.grid}>
          <DarkTile
            title="Bedtime"
            status="10:00 PM"
            style={styles.tile}
            onPress={() => {}}
            art={<Moon size={72} weight="fill" color={c.indigo} />}
          />
          <DarkTile
            title="Language"
            status="English"
            style={styles.tile}
            onPress={() => {}}
            art={<Translate size={72} weight="fill" color={c.tabInsights} />}
          />
          <DarkTile
            title="Guardian"
            status="Linked"
            statusAccent
            style={styles.tile}
            onPress={() => {}}
            art={<ShieldCheck size={72} weight="fill" color={c.success} />}
          />
          <DarkTile
            title="Offline packs"
            status="2 saved"
            style={styles.tile}
            onPress={() => {}}
            art={<BookOpenText size={72} weight="fill" color={c.spark} />}
          />
        </View>
      </Section>

      <Section title="Controls" index={next()}>
        <Card style={styles.gapMd}>
          <SegmentedControl
            options={[
              { value: 'you', label: 'For you' },
              { value: 'skills', label: 'Skills' },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <View style={styles.rowBetween}>
            <Text variant="body">Late-night alerts</Text>
            <Toggle value={on} onChange={setOn} accessibilityLabel="Late-night alerts" />
          </View>
          <WheelGroup>
            <WheelPicker
              items={Array.from({ length: 12 }, (_, k) => String(k + 1))}
              index={hour}
              onChange={setHour}
              accessibilityLabel="Hour"
            />
            <WheelPicker
              items={Array.from({ length: 60 }, (_, k) => String(k).padStart(2, '0'))}
              index={minute}
              onChange={setMinute}
              accessibilityLabel="Minute"
            />
            <WheelPicker items={['AM', 'PM']} index={ampm} onChange={setAmpm} accessibilityLabel="AM or PM" />
          </WheelGroup>
          <Text variant="subhead" align="center">
            {hour + 1}:{String(minute).padStart(2, '0')} {ampm ? 'PM' : 'AM'}
          </Text>
        </Card>
        <View style={styles.row}>
          <Stepper
            label="Focus"
            value={mins}
            onChange={setMins}
            unit="min"
            min={5}
            max={60}
            step={5}
            style={styles.flex}
          />
          <Stepper label="Cap" value={15} onChange={() => {}} unit="min" min={15} max={15} style={styles.flex} />
        </View>
      </Section>

      <Section title="Insights" index={next()}>
        <Card style={styles.gapMd}>
          <View style={styles.rowBetween}>
            <Text variant="headline">Learning days</Text>
            <View style={styles.inlineNum}>
              <Text variant="title">18</Text>
              <Text variant="caption"> days</Text>
            </View>
          </View>
          <Heatmap
            data={heat}
            weeks={22}
            months={[
              { week: 0, label: 'Jul' },
              { week: 5, label: 'Aug' },
              { week: 9, label: 'Sep' },
              { week: 13, label: 'Oct' },
              { week: 18, label: 'Nov' },
            ]}
            accessibilityLabel="Learning days heatmap, July to November, 18 days"
          />
        </Card>
        <Card style={styles.gapMd}>
          <View style={styles.rowBetween}>
            <View>
              <Text variant="headline">Screen time</Text>
              <Text variant="subhead">2h 14m avg</Text>
            </View>
            <Text variant="subhead" color="success">
              ↓ 32m vs last week
            </Text>
          </View>
          <BarChart
            values={[150, 132, 170, 124, 118, 96, 134]}
            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            highlight={6}
            highlightLabel="2h 14m"
            accessibilityLabel="Screen time by weekday"
          />
        </Card>
        <View style={styles.row}>
          <StatTile
            label="Late-night"
            value="12"
            unit="m"
            caption="this week"
            icon={<Moon size={16} weight="fill" color={c.indigo} />}
          />
          <StatTile
            label="Breaks"
            value="9/12"
            caption="taken"
            icon={<Lightning size={16} weight="fill" color={c.accent} />}
          />
        </View>
        <View style={styles.row}>
          <StatTile
            label="Mastery"
            value="+14"
            unit="%"
            caption="Fractions up"
            icon={<Sparkle size={16} weight="fill" color={c.success} />}
          />
          <StatTile
            label="Feed"
            value="48"
            unit="m"
            caption="under cap"
            icon={<Timer size={16} weight="fill" color={c.tabInsights} />}
          />
        </View>
        <Card style={styles.report}>
          <Ring progress={0.82} size={104} stroke={9} accessibilityLabel="Grade B plus">
            <Text variant="statNumber">B+</Text>
          </Ring>
          <View style={styles.flexGap}>
            <Chip label="Tarsi report" kind="accent" style={styles.smallChip} />
            <Text variant="headline">Steady week.</Text>
            <Text variant="subhead">3 calm nights · Fractions up</Text>
          </View>
        </Card>
        <Card style={styles.gapSm}>
          <View style={styles.rowBetween}>
            <Text variant="headline">A great day</Text>
            <CoinCounter value={coins} />
          </View>
          <ProgressBar
            segments={[
              { value: 0.12, color: c.spark },
              { value: 0.1, color: c.accent },
              { value: 0.08, color: c.danger },
              { value: 0.45, color: c.success },
            ]}
            accessibilityLabel="Coins toward next building"
          />
          <ProgressBar progress={0.62} color={c.success} accessibilityLabel="Fractions mastery 62 percent" />
          <PillButton label="+20 coins" kind="secondary" size="sm" onPress={() => setCoins((v) => v + 20)} />
        </Card>
      </Section>

      <Section title="Streak" index={next()}>
        <Card style={styles.gapMd}>
          <View style={styles.rowBetween}>
            <Text variant="title">LearnShift</Text>
            <SparkCount value={3} />
          </View>
          <View style={styles.pt}>
            <StreakRow days={streak} />
          </View>
          <View style={styles.wrap}>
            <TarsiSpark state="done" />
            <TarsiSpark state="today" />
            <TarsiSpark state="rest" />
            <TarsiSpark state="future" />
          </View>
        </Card>
      </Section>

      <Section title="Tarsi" index={next()}>
        <Card>
          <View style={styles.tarsiGrid}>
            {expressions.map((e) => (
              <View key={e} style={styles.tarsiCell}>
                <Tarsi expression={e} size={92} />
                <Text variant="caption">{e}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <Section title="Lists & sheets" index={next()}>
        <Card padded={false}>
          <SheetHeader
            title="Bedtime"
            left={{ label: 'Cancel', onPress: () => {} }}
            right={{ label: 'Done', onPress: () => {} }}
          />
          <View style={styles.sheetBody}>
            <Text variant="subhead">Sheet header (grabber, Cancel, Done)</Text>
          </View>
        </Card>
        <ListGroup>
          <ListRow title="Privacy center" onPress={() => {}} />
          <ListRow title="Nudge history" value="24" onPress={() => {}} />
          <ListRow title="Version" value="0.1.0 (1)" chevron={false} />
          <ListRow title="Delete account" destructive onPress={() => {}} />
        </ListGroup>
      </Section>

      <Section title="Loading & empty" index={next()}>
        <Card style={styles.gapSm}>
          <Skeleton width="60%" height={20} />
          <Skeleton height={14} />
          <Skeleton width="40%" height={14} />
          <View style={styles.row}>
            <Skeleton height={84} r={20} style={styles.flex} />
            <Skeleton height={84} r={20} style={styles.flex} />
          </View>
        </Card>
        <Card>
          <EmptyState title="No nudges yet" subtitle="Tarsi is keeping quiet. Nice." expression="happy" />
        </Card>
      </Section>

      <Section title="Slider & sheet" index={next()}>
        <Card style={styles.gapMd}>
          <Text variant="subhead">Value {slide}</Text>
          <Slider value={slide} min={0} max={100} onChange={setSlide} accessibilityLabel="Sample slider" />
          <PillButton label="Open bottom sheet" kind="secondary" onPress={() => setSheet(true)} />
        </Card>
      </Section>

      <Section title="Quiz options" index={next()}>
        <View style={styles.gapSm}>
          <QuizOption index={0} label="2/5" state="wrong" onPress={() => {}} />
          <QuizOption index={1} label="5/6" state="correct" onPress={() => {}} />
          <QuizOption index={2} label="1/6" state="idle" onPress={() => {}} />
          <QuizOption index={3} label="2/6" state="dim" onPress={() => {}} />
        </View>
      </Section>

      <Section title="Diagrams" index={next()}>
        <Card style={styles.gapMd}>
          <Diagram spec={{ kind: 'sum', parts: 6, a: 3, b: 2, label: '5/6' }} width={280} />
          <Diagram spec={{ kind: 'numberline', from: -4, to: 5, start: -3, jump: 7 }} width={280} />
          <Diagram spec={{ kind: 'balance', left: 'x + 5', right: '12' }} width={280} />
          <Diagram spec={{ kind: 'tiles', x: 3, ones: 2 }} width={280} />
        </Card>
      </Section>

      <Section title="Skill map" index={next()}>
        <Card>
          <SkillGraph mastery={MIKA_MASTERY} root="fractions" blocked={['linear', 'algebraic']} width={300} />
        </Card>
      </Section>

      <Section title="Isla & tile art" index={next()}>
        <Card padded={false}>
          <IslaScene built={SEED_BUILT} width={320} />
        </Card>
        <View style={styles.wrap}>
          <MoonArt size={64} />
          <LanguageArt size={64} />
          <ShieldArt size={64} />
          <BooksArt size={64} />
          <FeedArt size={64} />
          <TutorArt size={64} />
        </View>
      </Section>

      <Section title="Tab bar" index={next()}>
        <Card padded={false} style={styles.tabCard}>
          <TabBar active={tab} onTab={setTab} onShift={() => setShift((s) => !s)} shiftOpen={shift} inline />
        </Card>
      </Section>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <Text variant="title">Bottom sheet</Text>
        <Text variant="subhead">Drag the grabber down or tap outside.</Text>
      </BottomSheet>
    </ScrollView>
  );
}

function Section({ title, index, children }: { title: string; index: number; children: ReactNode }) {
  return (
    <Stagger index={index} style={styles.section}>
      <Text variant="overline" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Stagger>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  switcher: { paddingHorizontal: space.screen, paddingVertical: 12, maxWidth: 520 },
  columns: { flex: 1, flexDirection: 'row' },
  col: { flex: 1 },
  content: { padding: space.screen, paddingBottom: 80, maxWidth: 560, width: '100%', alignSelf: 'center' },
  section: { gap: space.gap, marginBottom: space.section },
  sectionTitle: { marginLeft: 4 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 4 },
  gapSm: { gap: 10 },
  gapMd: { gap: 16 },
  row: { flexDirection: 'row', gap: space.gap },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  center: { alignItems: 'center' },
  heroNum: { flexDirection: 'row', alignItems: 'flex-end' },
  unit: { marginBottom: 8, marginLeft: 2 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeLabel: { width: 74 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 72, gap: 4 },
  swatchChip: { height: 40, borderRadius: 12, borderWidth: 1 },
  breakCard: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  breakText: { flex: 1, gap: 2 },
  mt8: { marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  tile: { flexBasis: '47%', flexGrow: 1 },
  inlineNum: { flexDirection: 'row', alignItems: 'flex-end' },
  report: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  smallChip: { height: 24, paddingHorizontal: 10, marginBottom: 4 },
  pt: { paddingTop: 36 },
  tarsiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tarsiCell: { width: '25%', minWidth: 92, alignItems: 'center', gap: 2 },
  sheetBody: { padding: space.screen, paddingTop: 4 },
  tabCard: { paddingTop: 22 },
});
