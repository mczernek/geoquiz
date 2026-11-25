import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LANGUAGE_NAMES, LANGUAGES, useI18n, useLanguageStore } from '@/i18n';
import { useProgress } from '@/state/progress';
import { AccountError, deleteAccount, pendingChanges, signIn, signOut, signUp } from '@/sync/account';
import { syncNow, useSyncStatus } from '@/sync/engine';
import { colors, fonts, radius } from '@/theme';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { confirm } from '@/ui/confirm';
import { Logo } from '@/ui/Logo';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function SyncCard() {
  const { status, lastSyncedAt } = useSyncStatus();
  const dirty = useProgress((s) => Object.keys(s.dirty).length);
  const { t, language } = useI18n();
  return (
    <Panel style={styles.card}>
      <Text variant="heading" color={colors.ink}>
        {t.account.sync}
      </Text>
      <Text variant="body" color={colors.inkSoft} testID="sync-status">
        {t.account.status[status]}
      </Text>
      {dirty > 0 && status !== 'disabled' && (
        <Text variant="caption" color={colors.inkSoft}>
          {t.account.waiting(dirty)}
        </Text>
      )}
      {lastSyncedAt && (
        <Text variant="caption" color={colors.inkSoft}>
          {t.account.lastSynced(new Date(lastSyncedAt).toLocaleTimeString(language))}
        </Text>
      )}
      {status !== 'disabled' && (
        <Button
          title={t.account.syncNow}
          kind="secondary"
          size="m"
          icon="sync"
          onPress={() => syncNow()}
          loading={status === 'syncing'}
          style={styles.outlined}
        />
      )}
    </Panel>
  );
}

function AuthForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'up' | 'in'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'up') {
        const signedIn = await signUp(email, password);
        if (!signedIn) setMessage({ text: t.account.confirmEmail, error: false });
      } else await signIn(email, password);
    } catch (e) {
      setMessage({ text: e instanceof AccountError ? e.message : String(e), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel style={styles.card}>
      <Text variant="heading" color={colors.ink}>
        {t.account.keepTitle}
      </Text>
      <Text variant="body" color={colors.inkSoft}>
        {t.account.keepBody}
      </Text>
      <View style={styles.row}>
        <Chip onCard label={t.account.createAccount} selected={mode === 'up'} onPress={() => setMode('up')} />
        <Chip onCard label={t.account.signIn} selected={mode === 'in'} onPress={() => setMode('in')} />
      </View>
      <TextInput
        testID="email"
        value={email}
        onChangeText={setEmail}
        placeholder={t.account.email}
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        style={styles.input}
        accessibilityLabel={t.account.email}
      />
      <TextInput
        testID="password"
        value={password}
        onChangeText={setPassword}
        placeholder={t.account.password}
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
        textContentType={mode === 'up' ? 'newPassword' : 'password'}
        onSubmitEditing={submit}
        style={styles.input}
        accessibilityLabel={t.account.passwordLabel}
      />
      {message && (
        <Text variant="body" color={message.error ? colors.wrongDeep : colors.correctDeep}>
          {message.text}
        </Text>
      )}
      <Button
        title={mode === 'up' ? t.account.createAccount : t.account.signIn}
        onPress={submit}
        loading={busy}
        disabled={!email.includes('@') || password.length < 8}
        testID="auth-submit"
      />
    </Panel>
  );
}

function SignedIn({ email }: { email: string }) {
  const { t } = useI18n();
  const out = async () => {
    const pending = pendingChanges();
    if (pending > 0 && !(await confirm(t.account.signOutTitle, t.account.signOutBody(pending), t.account.signOut)))
      return;
    await signOut();
  };
  const remove = async () => {
    if (!(await confirm(t.account.deleteTitle, t.account.deleteBody, t.account.delete))) return;
    try {
      await deleteAccount();
    } catch (e) {
      await confirm(t.account.deleteFailed, String(e instanceof Error ? e.message : e), t.common.ok);
    }
  };
  return (
    <Panel style={styles.card}>
      <Text variant="heading" color={colors.ink}>
        {t.account.signedIn}
      </Text>
      <Text variant="body" color={colors.inkSoft}>
        {email}
      </Text>
      <View style={styles.row}>
        <Button
          title={t.account.signOut}
          kind="secondary"
          size="m"
          onPress={out}
          style={[styles.flex, styles.outlined]}
        />
        <Button title={t.account.deleteAccount} kind="danger" size="m" onPress={remove} style={styles.flex} />
      </View>
    </Panel>
  );
}

function LanguagePicker() {
  const { t, language } = useI18n();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  return (
    <Panel style={styles.card}>
      <Text variant="heading" color={colors.ink}>
        {t.account.language}
      </Text>
      <View style={styles.row}>
        {LANGUAGES.map((l) => (
          <Chip
            key={l}
            onCard
            testID={`language-${l}`}
            label={LANGUAGE_NAMES[l]}
            selected={language === l}
            onPress={() => setLanguage(l)}
          />
        ))}
      </View>
    </Panel>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { status, user } = useSyncStatus();
  const reset = useProgress((s) => s.reset);
  const { t } = useI18n();

  const onReset = async () => {
    if (await confirm(t.account.resetTitle, t.account.resetBody, t.account.resetAction)) reset();
  };

  return (
    <Screen title={t.account.title}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <SyncCard />
          {status !== 'disabled' &&
            (user && !user.anonymous && user.email ? <SignedIn email={user.email} /> : <AuthForm />)}
          <LanguagePicker />
          <Panel style={styles.card}>
            <Text variant="heading" color={colors.ink}>
              {t.account.startOver}
            </Text>
            <Button title={t.account.reset} kind="danger" size="m" icon="refresh" onPress={onReset} testID="reset" />
          </Panel>
          <View style={styles.about}>
            <Logo size="s" />
            <Text variant="label" color="rgba(255,255,255,0.9)">
              {t.tagline}
            </Text>
          </View>
          <View style={styles.credits}>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              {t.account.credits}
            </Text>
            <Text
              variant="caption"
              color={colors.white}
              style={styles.link}
              onPress={() => Linking.openURL('https://github.com/mledoze/countries')}
              accessibilityRole="link"
            >
              {t.account.licenses}
            </Text>
          </View>
        </ScrollView>
        <GlobeSlot style={styles.globe} fill={0.85} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  globe: { flex: 1, minHeight: 140 },
  content: { padding: 16, gap: 14 },
  card: { gap: 10 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  outlined: { borderColor: '#DCCFFF' },
  input: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: '#F3EEFF',
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: '#DCCFFF',
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, default: 8 }),
  },
  about: { alignItems: 'center', gap: 2, marginTop: 6 },
  credits: { gap: 4, paddingHorizontal: 4 },
  link: { textDecorationLine: 'underline' },
});
