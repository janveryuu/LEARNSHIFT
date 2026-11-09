import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '@/design/theme';
import { useT } from '@/i18n/useT';

import { Text } from './Text';

type Props = {
  /** Intensity 0–4 per day, oldest first. Length should be weeks × 7. */
  data: readonly number[];
  weeks: number;
  /** Month label positions: week index → label. */
  months?: readonly { week: number; label: string }[];
  /** Day row labels (Mon, Wed, Fri by default). */
  rowLabels?: readonly (string | null)[];
  legend?: boolean;
  accessibilityLabel?: string;
};

const LABEL_W = 16;
const GAP = 3;

/** Contribution-style heatmap of learning days. */
export function Heatmap({ data, weeks, months, rowLabels, legend = true, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const t = useT();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const labels = rowLabels ?? [null, t.days.narrow[1], null, t.days.narrow[3], null, t.days.narrow[5], null];
  const cell = width > 0 ? Math.min(16, (width - LABEL_W - GAP * (weeks - 1)) / weeks) : 0;
  const gridW = cell * weeks + GAP * (weeks - 1);
  const gridH = cell * 7 + GAP * 6;

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {cell > 0 ? (
        <>
          <View style={[styles.months, { marginLeft: LABEL_W, width: gridW }]}>
            {(months ?? []).map((m) => (
              <Text key={m.label + m.week} variant="caption" style={[styles.month, { left: m.week * (cell + GAP) }]}>
                {m.label}
              </Text>
            ))}
          </View>
          <View style={styles.body}>
            <View style={{ width: LABEL_W, height: gridH }}>
              {labels.map((l, i) =>
                l ? (
                  <Text key={i} variant="caption" style={[styles.rowLabel, { top: i * (cell + GAP) + cell / 2 - 7 }]}>
                    {l}
                  </Text>
                ) : null,
              )}
            </View>
            <Svg width={gridW} height={gridH}>
              {Array.from({ length: weeks * 7 }, (_, k) => {
                const w = Math.floor(k / 7);
                const d = k % 7;
                const v = data[k] ?? 0;
                return (
                  <Rect
                    key={k}
                    x={w * (cell + GAP)}
                    y={d * (cell + GAP)}
                    width={cell}
                    height={cell}
                    rx={cell * 0.28}
                    fill={c.heat[Math.max(0, Math.min(4, v))]}
                  />
                );
              })}
            </Svg>
          </View>
          {legend ? (
            <View style={styles.legend}>
              <Text variant="caption">{t.common.less}</Text>
              {c.heat.map((h) => (
                <View key={h} style={[styles.legendCell, { backgroundColor: h }]} />
              ))}
              <Text variant="caption">{t.common.more}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  months: { height: 16, marginBottom: 4 },
  month: { position: 'absolute', top: 0 },
  body: { flexDirection: 'row' },
  rowLabel: { position: 'absolute', left: 0 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 },
  legendCell: { width: 10, height: 10, borderRadius: 3 },
});
