import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, CheckCircle, SealCheck, Warning, XCircle } from 'phosphor-react-native';

import { Paty } from '@/components/mascot/Paty';
import { Card, Chip, InsetCard, PressableScale, SegmentedControl, SheetHeader, Skeleton, Text } from '@/components/ui';
import { QUESTION_BY_ID } from '@/data/questions';
import { haptic } from '@/design/haptics';
import { ease } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { fontFor } from '@/design/typography';
import { stringsFor, useLang } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
import { chat as askTutor, explain } from '@/services/ai/liveTutor';
import type { TutorAnswer, TutorVariant } from '@/services/types';
import { useAppStore, type Lang } from '@/store/useAppStore';

export default function TutorSheet() {
  const { c } = useTheme();
  const appLang = useLang();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; a?: string }>();
  const lastMiss = useAppStore((s) => s.lastMiss);
  const qid = params.q ?? lastMiss?.q ?? 'fra-1';
  const wrong = params.a != null ? Number(params.a) : (lastMiss?.a ?? 0);
  const q = QUESTION_BY_ID[qid];

  const [lang, setLang] = useState<Lang>(appLang);
  const [variant, setVariant] = useState<TutorVariant>('default');
  const [res, setRes] = useState<{ key: string; ans: TutorAnswer } | null>(null);
  const reqKey = `${qid}|${wrong}|${lang}|${variant}`;
  const ans = res?.key === reqKey ? res.ans : null;
  const [checkPick, setCheckPick] = useState<number | null>(null);
  const [chat, setChat] = useState<{ me: string; reply: string }[]>([]);
  const [draft, setDraft] = useState('');
  const flagged = useRef(false);
  const t = stringsFor(lang);
  const fade = useSharedValue(1);

  useEffect(() => {
    let live = true;
    explain(qid, wrong, lang, variant).then((r) => {
      if (!live) return;
      setRes({ key: `${qid}|${wrong}|${lang}|${variant}`, ans: r });
      fade.set(withSequence(withTiming(0.35, { duration: 1 }), withTiming(1, { duration: 320, easing: ease.out })));
      // Real builds flag on the server; the demo keeps its local review queue.
      if (IS_PITCH && r.confidence < 0.7 && !flagged.current) {
        flagged.current = true;
        useAppStore
          .getState()
          .flag({ student: 'Mika Santos', questionId: qid, wrongIndex: wrong, confidence: r.confidence });
      }
    });
    return () => {
      live = false;
    };
  }, [qid, wrong, lang, variant, fade]);

  const body = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const send = () => {
    const text = draft.trim();
    if (!text || !ans) return;
    haptic.select();
    const history = chat;
    setChat((m) => [...m, { me: text, reply: '…' }]);
    setDraft('');
    askTutor(qid, lang, history, text, `${t.tutor.reply} ${ans.example}`).then((reply) =>
      setChat((m) => m.map((x, k) => (k === m.length - 1 && x.me === text ? { ...x, reply } : x))),
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SheetHeader title={t.tutor.title} right={{ label: t.common.done, onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SegmentedControl<Lang>
          options={[
            { value: 'en', label: 'EN' },
            { value: 'fil', label: 'FIL' },
          ]}
          value={lang}
          onChange={setLang}
          compact
          style={styles.seg}
        />

        <Card style={styles.gap}>
          <Text variant="title">{q.prompt[lang]}</Text>
          <AnswerRow label={t.tutor.yourAnswer} value={q.options[wrong]} tone="wrong" />
          <AnswerRow label={t.tutor.correct} value={q.options[q.answer]} tone="right" />
        </Card>

        {!ans ? (
          <Card style={styles.gap}>
            <View style={styles.thinking}>
              <Paty expression="curious" size={56} />
              <Text variant="subhead">{t.tutor.thinking}…</Text>
            </View>
            <Skeleton width="80%" height={18} />
            <Skeleton height={14} />
            <Skeleton width="60%" height={14} />
          </Card>
        ) : (
          <Animated.View style={[styles.gapLg, body]}>
            {ans.confidence < 0.7 ? (
              <View style={[styles.banner, { backgroundColor: c.accentTint }]}>
                <Warning size={18} weight="fill" color={c.warning} />
                <Text variant="subhead" color="text" style={styles.flex}>
                  {t.tutor.lowConf}
                </Text>
              </View>
            ) : null}

            <Card style={styles.gap}>
              <Text variant="overline">{t.tutor.whatHappened}</Text>
              <Text variant="headline">{ans.what}</Text>
            </Card>

            {ans.steps.map((s, i) => (
              <InsetCard
                key={`${variant}-${i}`}
                label={t.tutor.step(i + 1)}
                style={[styles.step, { backgroundColor: c.card }]}
              >
                <Text variant="body">{s}</Text>
              </InsetCard>
            ))}

            {ans.example ? (
              <Card style={styles.gap}>
                <Text variant="overline">{t.tutor.example}</Text>
                <Text variant="title" color="accent">
                  {ans.example}
                </Text>
              </Card>
            ) : null}

            {ans.check ? (
              <Card style={styles.gap}>
                <Text variant="overline">{t.tutor.check}</Text>
                <Text variant="headline">{ans.check.prompt}</Text>
                <View style={styles.checkRow}>
                  {ans.check.options.map((o, i) => {
                    const chosen = checkPick === i;
                    const right = i === ans.check!.answer;
                    return (
                      <Chip
                        key={o}
                        label={o}
                        kind={chosen ? 'accent' : 'neutral'}
                        tint={
                          chosen
                            ? right
                              ? { bg: c.success, fg: '#FFFFFF' }
                              : { bg: c.danger, fg: '#FFFFFF' }
                            : undefined
                        }
                        onPress={() => {
                          setCheckPick(i);
                          if (right) haptic.success();
                          else haptic.warning();
                        }}
                      />
                    );
                  })}
                </View>
                {checkPick != null ? (
                  <Text variant="subhead" color={checkPick === ans.check.answer ? 'success' : 'text'}>
                    {checkPick === ans.check.answer ? t.tutor.checkRight : t.tutor.checkWrong}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            <View style={styles.source}>
              <SealCheck size={16} weight="fill" color={ans.source === 'bank' ? c.success : c.textTertiary} />
              <Text variant="caption">{ans.source === 'generated' ? t.tutor.sourceAi : t.tutor.source}</Text>
            </View>

            {chat.map((m, i) => (
              <View key={i} style={styles.gap}>
                <View style={[styles.bubbleMe, { backgroundColor: c.accent }]}>
                  <Text variant="body" color="onAccent">
                    {m.me}
                  </Text>
                </View>
                <View style={[styles.bubble, { backgroundColor: c.card }]}>
                  <Text variant="body">{m.reply}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quick}
          keyboardShouldPersistTaps="handled"
        >
          <Chip
            label={t.tutor.simpler}
            selected={variant === 'simpler'}
            onPress={() => setVariant(variant === 'simpler' ? 'default' : 'simpler')}
          />
          <Chip
            label={t.tutor.another}
            selected={variant === 'example2'}
            onPress={() => setVariant(variant === 'example2' ? 'default' : 'example2')}
          />
          <Chip
            label={lang === 'en' ? t.tutor.inFil : t.tutor.inEn}
            onPress={() => setLang(lang === 'en' ? 'fil' : 'en')}
          />
        </ScrollView>
        <View style={[styles.inputRow, { backgroundColor: c.card }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t.tutor.placeholder}
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text }]}
            onSubmitEditing={send}
            returnKeyType="send"
            accessibilityLabel={t.tutor.placeholder}
          />
          <PressableScale
            onPress={send}
            accessibilityLabel={t.tutor.send}
            style={[styles.send, { backgroundColor: draft.trim() ? c.accent : c.inset }]}
          >
            <ArrowUp size={18} weight="bold" color={draft.trim() ? c.onAccent : c.textTertiary} />
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function AnswerRow({ label, value, tone }: { label: string; value: string; tone: 'wrong' | 'right' }) {
  const { c } = useTheme();
  const color = tone === 'wrong' ? c.danger : c.success;
  const Icon = tone === 'wrong' ? XCircle : CheckCircle;
  return (
    <View style={[styles.answer, { backgroundColor: tone === 'wrong' ? c.accentTint : c.inset, borderColor: color }]}>
      <Icon size={20} weight="fill" color={color} />
      <Text variant="subhead" style={styles.flex}>
        {label}
      </Text>
      <Text variant="title" color={color}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: {
    paddingHorizontal: space.screen,
    paddingBottom: 24,
    gap: space.gap,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  seg: { alignSelf: 'center', width: 160, marginBottom: 4 },
  gap: { gap: 10 },
  gapLg: { gap: space.gap },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.inset },
  step: { gap: 6 },
  checkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 4 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.inset,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1.5,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    maxWidth: '80%',
  },
  bubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    maxWidth: '85%',
  },
  composer: {
    paddingHorizontal: space.screen,
    paddingTop: 8,
    gap: 8,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  quick: { gap: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingLeft: 16,
    paddingRight: 5,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, ...fontFor(500), height: 48 },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
