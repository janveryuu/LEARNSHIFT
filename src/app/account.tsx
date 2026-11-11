import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChalkboardTeacher, HouseLine, SignOut, Trash } from 'phosphor-react-native';

import { PatyAvatar } from '@/components/mascot/Paty';
import { MonitorSetup } from '@/components/student/MonitorSetup';
import { Card, ListGroup, ListRow, Notice, PillButton, SheetHeader, Text, TextField } from '@/components/ui';
import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useT } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
import * as api from '@/services/backend/api';
import { pullStudent } from '@/services/backend/sync';
import { forgetDevice, platform, testNudge } from '@/services/monitor';
import { useDevice } from '@/services/monitor/bridge';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

/** Student account: family link, class, phone setup, sign out, delete. */
export default function Account() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const profile = useAuth((s) => s.profile);
  const guardians = useAppStore((s) => s.guardians);
  const classes = useAppStore((s) => s.classes);
  const running = useDevice((s) => s.status.running);
  const [code, setCode] = useState<string | null>(null);
  const [classCode, setClassCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);

  useEffect(() => {
    if (IS_PITCH || profile?.role !== 'student') return;
    let live = true;
    api
      .myLinkCode(false)
      .then((x) => live && setCode(x))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [profile?.role]);
  const loadCode = (regenerate: boolean) =>
    api
      .myLinkCode(regenerate)
      .then(setCode)
      .catch((e: Error) => setError(e.message));

  if (IS_PITCH) return <Redirect href="/privacy" />;
  if (!profile || profile.role !== 'student') return <Redirect href="/" />;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
      await pullStudent(profile.id).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
      haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await forgetDevice().catch(() => {});
    await api.signOut();
    router.replace('/onboarding');
  };

  const deleteAccount = () =>
    run(async () => {
      await forgetDevice().catch(() => {});
      await api.deleteAccount();
      router.replace('/onboarding');
    });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: c.bg }]}>
      <SheetHeader title="Account" right={{ label: t.common.done, onPress: () => router.back() }} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.me}>
          <PatyAvatar size={52} />
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={1}>
              {profile.display_name}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {t.acct.signedInAs(profile.email)}
            </Text>
          </View>
        </Card>

        {error ? <Notice text={error} /> : null}
        {info ? <Notice text={info} tone="success" /> : null}

        <Text variant="overline" style={styles.label}>
          {t.profile.guardian}
        </Text>
        {guardians.length ? (
          <ListGroup>
            {guardians.map((g) => (
              <ListRow
                key={g.id}
                title={g.name}
                icon={<HouseLine size={20} weight="fill" color={c.success} />}
                value={confirmUnlink === g.id ? '' : t.profile.linked}
                chevron={false}
                right={
                  <PillButton
                    label={confirmUnlink === g.id ? t.common.continue : '×'}
                    kind={confirmUnlink === g.id ? 'destructive' : 'neutral'}
                    size="sm"
                    accessibilityLabel={`Unlink ${g.name}`}
                    onPress={() => {
                      if (confirmUnlink !== g.id) return setConfirmUnlink(g.id);
                      setConfirmUnlink(null);
                      run(() => api.unlink(g.id, profile.id));
                    }}
                  />
                }
              />
            ))}
          </ListGroup>
        ) : null}
        <Card style={styles.gap}>
          <Text variant="subhead">{t.acct.linkSub}</Text>
          <View style={styles.code} accessible accessibilityLabel={(code ?? '').split('').join(' ')}>
            {(code ?? '······').split('').map((d, k) => (
              <View key={k} style={[styles.codeBox, { backgroundColor: c.inset }, k === 3 && styles.codeGap]}>
                <Text variant="title" tabular>
                  {d}
                </Text>
              </View>
            ))}
          </View>
          <PillButton label={t.acct.newCode} kind="neutral" size="sm" onPress={() => loadCode(true)} />
        </Card>

        <Text variant="overline" style={styles.label}>
          {t.acct.classTitle}
        </Text>
        {classes.length ? (
          <ListGroup>
            {classes.map((k) => (
              <ListRow
                key={k.id}
                title={k.name}
                icon={<ChalkboardTeacher size={20} weight="fill" color={c.tabInsights} />}
                chevron={false}
                right={
                  <PillButton
                    label="×"
                    kind="neutral"
                    size="sm"
                    accessibilityLabel={`Leave ${k.name}`}
                    onPress={() => run(() => api.leaveClass(k.id))}
                  />
                }
              />
            ))}
          </ListGroup>
        ) : null}
        <Card style={styles.gap}>
          <TextField
            label={t.acct.classCode}
            placeholder="ABC234"
            value={classCode}
            onChangeText={(v) => setClassCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            code
            autoCapitalize="characters"
          />
          <PillButton
            label={t.acct.join}
            disabled={busy || classCode.length < 6}
            onPress={() =>
              run(async () => {
                const r = await api.joinClass(classCode);
                setClassCode('');
                setInfo(t.acct.joined(r.name));
                haptic.success();
              })
            }
          />
        </Card>

        <Text variant="overline" style={styles.label}>
          {platform === 'none' ? t.acct.monitorWeb : running ? t.acct.monitorOn : t.acct.monitorOff}
        </Text>
        <MonitorSetup />
        {platform !== 'none' ? (
          <PillButton
            label={t.acct.testNudge}
            kind="neutral"
            onPress={() => {
              if (testNudge('checkin')) setInfo(t.acct.testSent);
            }}
          />
        ) : null}

        <ListGroup style={styles.spaced}>
          <ListRow
            title={t.acct.signOut}
            icon={<SignOut size={20} weight="bold" color={c.text} />}
            chevron={false}
            onPress={signOut}
          />
          <ListRow
            title={confirmDelete ? t.profile.delConfirm : t.profile.del}
            icon={<Trash size={20} weight="bold" color={c.danger} />}
            destructive
            chevron={false}
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              deleteAccount();
            }}
          />
        </ListGroup>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gap: { gap: 12, alignItems: 'stretch' },
  label: { marginTop: 14, paddingHorizontal: 4 },
  code: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  codeBox: { width: 40, height: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  codeGap: { marginLeft: 10 },
  spaced: { marginTop: 18 },
});
