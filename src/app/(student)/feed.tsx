import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkSimple, ChatTeardropText, Translate, X } from 'phosphor-react-native';

import { Diagram } from '@/components/learn/Diagram';
import { Tarsi } from '@/components/mascot/Tarsi';
import { Chip, IconButton, PillButton, PressableScale, ProgressBar, Text } from '@/components/ui';
import { FEED, type FeedCard } from '@/data/lessons';
import { questionsFor } from '@/data/questions';
import { SHORT } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { ease, useReducedMotion } from '@/design/motion';
import { ThemeProvider } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { stringsFor, useLang } from '@/i18n/useT';
import { useAppStore, type Lang } from '@/store/useAppStore';

const CAP = 15;
const PER_CARD = 1.5;
const BG = '#0B0D14';

type Item = { kind: 'card'; card: FeedCard } | { kind: 'end' };

export default function Feed() {
  return (
    <ThemeProvider mode="night">
      <FeedScreen />
    </ThemeProvider>
  );
}

function FeedScreen() {
  const appLang = useLang();
  const t = stringsFor(appLang);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const feed = useAppStore((s) => s.feed);
  const today = new Date().toISOString().slice(0, 10);
  const used = feed.day === today ? feed.minutes : 0;

  // No infinite scroll: only as many cards as today's cap allows, then an end card.
  const [items] = useState<Item[]>(() => {
    const room = Math.max(0, CAP - used);
    const n = Math.min(FEED.length, Math.ceil(room / PER_CARD));
    return [...FEED.slice(0, n).map((card) => ({ kind: 'card' as const, card })), { kind: 'end' as const }];
  });
  const seen = useRef(new Set<string>());

  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
    for (const v of viewableItems) {
      const it = v.item;
      if (it?.kind === 'card' && !seen.current.has(it.card.id)) {
        seen.current.add(it.card.id);
        const s = useAppStore.getState();
        const cur = s.feed.day === today ? s.feed.minutes : 0;
        if (cur < CAP) s.addFeedMinutes(Math.min(PER_CARD, CAP - cur));
      }
    }
  });

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <FlashList
        data={items}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        keyExtractor={(it) => (it.kind === 'card' ? it.card.id : 'end')}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) =>
          item.kind === 'card' ? (
            <CardPage card={item.card} height={height} width={width} />
          ) : (
            <EndPage height={height} />
          )
        }
      />
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <IconButton
          tone="glass"
          icon={<X size={18} weight="bold" color="#FFFFFF" />}
          accessibilityLabel={t.common.close}
          onPress={() => router.back()}
        />
        <View style={styles.cap}>
          <Text variant="caption" color="rgba(255,255,255,0.8)" tabular>
            {t.feed.cap(Math.round(used), CAP)}
          </Text>
          <ProgressBar
            progress={Math.min(1, used / CAP)}
            color="#F5C46B"
            height={6}
            style={styles.track}
            accessibilityLabel={t.feed.cap(Math.round(used), CAP)}
          />
        </View>
      </View>
    </View>
  );
}

function CardPage({ card, height, width }: { card: FeedCard; height: number; width: number }) {
  const appLang = useLang();
  const [lang, setLang] = useState<Lang>(appLang);
  const [pick, setPick] = useState<number | null>(null);
  const saved = useAppStore((s) => s.feed.saved.includes(card.id));
  const t = stringsFor(lang);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    float.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: ease.inOut }),
          withTiming(0, { duration: 2400, easing: ease.inOut }),
        ),
        -1,
      ),
    );
  }, [reduced, float]);
  const art = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() * -8 }] }));
  const w = Math.min(width, 520) - space.screen * 2 - 64;
  const explainQ = questionsFor(card.skill).find((q) => Object.values(q.mis).some((m) => m && m !== 'unknown'));

  return (
    <View style={[styles.page, { height, paddingTop: insets.top + 70, paddingBottom: insets.bottom + 30 }]}>
      <View style={styles.pageInner}>
        <Chip label={SHORT[card.skill][lang]} kind="outline" tint={{ bg: 'rgba(255,255,255,0.1)', fg: '#F4EFE8' }} />
        <Animated.View style={[styles.art, art]}>
          <Diagram spec={card.diagram} width={w} onDark accessibilityLabel={card.title[lang]} />
        </Animated.View>
        <Text variant="title" color="#F4EFE8" numberOfLines={2} style={styles.title}>
          {card.title[lang]}
        </Text>
        <View style={styles.try}>
          <Text variant="overline" color="rgba(255,255,255,0.6)">
            {t.feed.tryIt} · {card.tryIt.prompt}
          </Text>
          <View style={styles.tryRow}>
            {card.tryIt.options.map((o, i) => {
              const chosen = pick === i;
              const right = i === card.tryIt.answer;
              return (
                <PressableScale
                  key={o}
                  onPress={() => {
                    if (pick != null) return;
                    setPick(i);
                    if (right) haptic.success();
                    else haptic.warning();
                  }}
                  accessibilityLabel={o}
                  style={[
                    styles.opt,
                    { backgroundColor: chosen ? (right ? '#5CC98A' : '#E88A86') : 'rgba(255,255,255,0.1)' },
                    pick != null && !chosen && right && styles.optReveal,
                  ]}
                >
                  <Text variant="headline" color={chosen ? '#10131F' : '#F4EFE8'}>
                    {o}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {pick != null ? (
            <Text variant="subhead" color={pick === card.tryIt.answer ? '#5CC98A' : '#F4EFE8'}>
              {pick === card.tryIt.answer ? t.feed.right : t.feed.wrong}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.actions, { bottom: insets.bottom + 40 }]}>
        <Action
          label={saved ? t.feed.saved : t.feed.save}
          icon={<BookmarkSimple size={26} weight="fill" color={saved ? '#F5C46B' : '#FFFFFF'} />}
          onPress={() => useAppStore.getState().toggleSaved(card.id)}
        />
        <Action
          label={lang === 'en' ? 'FIL' : 'EN'}
          icon={<Translate size={26} weight="fill" color="#FFFFFF" />}
          onPress={() => setLang(lang === 'en' ? 'fil' : 'en')}
        />
        <Action
          label={t.feed.explain}
          icon={<ChatTeardropText size={26} weight="fill" color="#FFFFFF" />}
          onPress={() => {
            if (!explainQ) return router.push('/tutor');
            const wrong = Number(Object.entries(explainQ.mis).find(([, m]) => m && m !== 'unknown')?.[0] ?? 0);
            router.push({ pathname: '/tutor', params: { q: explainQ.id, a: String(wrong) } });
          }}
        />
      </View>
    </View>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={styles.action}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text variant="caption" color="#FFFFFF">
        {label}
      </Text>
    </PressableScale>
  );
}

function EndPage({ height }: { height: number }) {
  const t = stringsFor(useLang());
  return (
    <View style={[styles.page, styles.end, { height }]}>
      <Tarsi expression="waving" size={170} />
      <Text variant="largeTitle" color="#F4EFE8" align="center">
        {t.feed.endTitle}
      </Text>
      <Text variant="body" color="rgba(244,239,232,0.7)" align="center">
        {t.feed.endSub}
      </Text>
      <PillButton label={t.feed.endBack} size="lg" style={styles.endBtn} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: space.screen,
  },
  cap: { flex: 1, gap: 6, maxWidth: 260 },
  track: { backgroundColor: 'rgba(255,255,255,0.14)' },
  page: { paddingHorizontal: space.screen },
  pageInner: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingRight: 64,
  },
  art: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.card,
    paddingHorizontal: 8,
  },
  title: { fontSize: 26, lineHeight: 31 },
  try: { gap: 10 },
  tryRow: { flexDirection: 'row', gap: 10 },
  opt: { flex: 1, height: 52, borderRadius: radius.inset, alignItems: 'center', justifyContent: 'center' },
  optReveal: { borderWidth: 2, borderColor: '#5CC98A' },
  actions: { position: 'absolute', right: 14, gap: 18, alignItems: 'center' },
  action: { alignItems: 'center', gap: 4, minWidth: 52 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  end: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  endBtn: { marginTop: 18 },
});
