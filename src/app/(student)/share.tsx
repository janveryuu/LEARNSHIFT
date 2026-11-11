import { Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareNetwork } from 'phosphor-react-native';

import { Paty } from '@/components/mascot/Paty';
import { BarChart, PillButton, Ring, SheetHeader, Text } from '@/components/ui';
import { gapEngine } from '@/services/ai/gapEngine';
import { IS_PITCH } from '@/lib/config';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useWeek, weeklyGrade, masteryGain } from '@/hooks/useWeek';
import { formatDuration, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

/** Share card of the weekly report: big numbers, Paty, no private details. */
export default function ShareCard() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const week = useWeek();
  const mastery = useAppStore((s) => s.mastery);
  const history = useAppStore((s) => s.history);
  const focus = IS_PITCH ? 'fractions' : gapEngine.rootGap(mastery);
  const { score, grade } = weeklyGrade(
    week.breaks,
    week.breakTarget,
    week.lateMinutes,
    masteryGain(mastery[focus], history[focus] ?? []),
  );
  const body = t.insights.shareBody(formatDuration(week.avgMinutes), formatDuration(week.dropMinutes), grade);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title={t.common.share} left={{ label: t.common.cancel, onPress: () => router.back() }} />
      <View style={styles.center}>
        <View
          style={[styles.card, { backgroundColor: c.tileDark }]}
          accessible
          accessibilityLabel={`${t.insights.shareTitle}. ${body}`}
        >
          <View style={styles.head}>
            <Text variant="overline" color={c.tileDarkSecondary}>
              {t.insights.shareTitle}
            </Text>
            <Text variant="caption" color={c.tileDarkSecondary}>
              LearnShift
            </Text>
          </View>
          <View style={styles.hero}>
            <Ring progress={score} size={110} stroke={10} color={c.spark} track="rgba(255,255,255,0.12)">
              <Text variant="statNumber" color={c.tileDarkText}>
                {grade}
              </Text>
            </Ring>
            <Paty expression="proud" size={120} alive={false} interactive={false} />
          </View>
          <View style={styles.nums}>
            <View style={styles.num}>
              <Text variant="statNumber" color={c.tileDarkText}>
                {formatDuration(week.avgMinutes)}
              </Text>
              <Text variant="caption" color={c.tileDarkSecondary}>
                {t.insights.avg('').trim()}
              </Text>
            </View>
            <View style={styles.num}>
              <Text variant="statNumber" color={c.success}>
                ↓{formatDuration(week.dropMinutes)}
              </Text>
              <Text variant="caption" color={c.tileDarkSecondary}>
                {t.insights.screenTime}
              </Text>
            </View>
            <View style={styles.num}>
              <Text variant="statNumber" color={c.spark}>
                {week.breaks}
              </Text>
              <Text variant="caption" color={c.tileDarkSecondary}>
                {t.insights.breaks}
              </Text>
            </View>
          </View>
          <BarChart
            values={week.days.map((d) => d.minutes)}
            labels={week.days.map((d) => t.days.narrow[d.weekday])}
            highlight={6}
            height={70}
          />
        </View>
      </View>
      <View style={styles.footer}>
        <PillButton
          label={t.common.share}
          size="lg"
          block
          icon={<ShareNetwork size={18} weight="fill" color={c.onAccent} />}
          onPress={() => Share.share({ message: `${t.insights.shareTitle}: ${body}` }).catch(() => {})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: space.screen },
  card: { borderRadius: radius.card, padding: 22, gap: 16, width: '100%', maxWidth: 420, alignSelf: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nums: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { gap: 2 },
  footer: { paddingHorizontal: space.screen, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
