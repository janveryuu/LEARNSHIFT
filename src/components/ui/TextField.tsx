import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeSlash, WarningCircle } from 'phosphor-react-native';

import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { fontFor } from '@/design/typography';

import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  /** Password field with a show / hide button. */
  secret?: boolean;
  /** Big, spaced characters for 6-digit and class codes. */
  code?: boolean;
};

/** Labeled text input that matches the app's cards and type scale. */
export function TextField({ label, error, secret, code, ...rest }: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="subhead" color="text">
        {label}
      </Text>
      <View
        style={[
          styles.box,
          { backgroundColor: c.card, borderColor: error ? c.danger : focused ? c.accent : c.hairline },
        ]}
      >
        <TextInput
          placeholderTextColor={c.textTertiary}
          secureTextEntry={secret && !shown}
          autoCapitalize={secret || code ? 'none' : rest.autoCapitalize}
          autoCorrect={false}
          accessibilityLabel={label}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, code ? styles.code : null, fontFor(code ? 800 : 500), { color: c.text }]}
        />
        {secret ? (
          <Pressable
            onPress={() => setShown((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            style={styles.eye}
          >
            {shown ? <EyeSlash size={20} color={c.textSecondary} /> : <Eye size={20} color={c.textSecondary} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.err} accessibilityLiveRegion="polite">
          <WarningCircle size={15} weight="fill" color={c.danger} />
          <Text variant="caption" color="danger" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** A one-line message box for form-level errors and confirmations. */
export function Notice({ text, tone = 'danger' }: { text: string; tone?: 'danger' | 'success' }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: tone === 'danger' ? c.accentTint : c.inset }]}
    >
      <Text variant="subhead" color={tone === 'danger' ? 'danger' : 'text'}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  flex: { flex: 1 },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.inset, minHeight: 52 },
  input: { flex: 1, fontSize: 17, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50 },
  code: { fontSize: 26, letterSpacing: 8, textAlign: 'center' },
  eye: { paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  err: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notice: { borderRadius: radius.inset, padding: 12 },
});
