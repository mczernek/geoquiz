import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProgress } from '@/state/progress';
import { AccountError, deleteAccount, pendingChanges, signIn, signOut, signUp } from '@/sync/account';
import { syncNow, useSyncStatus, type SyncStatus } from '@/sync/engine';
import { colors, fonts, radius } from '@/theme';
import { GlobeSlot } from '@/globe/GlobeSlot';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { confirm } from '@/ui/confirm';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const STATUS_TEXT: Record<SyncStatus, string> = {
  disabled: 'Sync isn’t set up in this build. Progress stays on this device.',
  idle: 'Progress is saved on this device.',
  syncing: 'Syncing…',
  synced: 'Progress is saved in the cloud.',
  offline: 'You’re offline. Progress is saved on this device and syncs when you’re back online.',
  error: 'Couldn’t sync right now. Progress is safe on this device.',
};

function SyncCard() {
  const { status, lastSyncedAt } = useSyncStatus();
  const dirty = useProgress((s) => Object.keys(s.dirty).length);
  return (
    <Panel style={styles.card}>
      <Text variant="heading" color={colors.ink}>
        Sync
      </Text>
      <Text variant="body" color={colors.inkSoft} testID="sync-status">
        {STATUS_TEXT[status]}
      </Text>
      {dirty > 0 && status !== 'disabled' && (
        <Text variant="caption" color={colors.inkSoft}>
          {dirty} {dirty === 1 ? 'change' : 'changes'} waiting to sync
        </Text>
      )}
      {lastSyncedAt && (
        <Text variant="caption" color={colors.inkSoft}>
          Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
        </Text>
      )}
      {status !== 'disabled' && (
        <Button
          title="Sync now"
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
        if (!signedIn) setMessage({ text: 'Check your inbox to confirm your email, then sign in.', error: false });
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
        Keep your progress
      </Text>
      <Text variant="body" color={colors.inkSoft}>
        Create an account to continue on your other devices. What you’ve learned here comes with you.
      </Text>
      <View style={styles.row}>
        <Chip onCard label="Create account" selected={mode === 'up'} onPress={() => setMode('up')} />
        <Chip onCard label="Sign in" selected={mode === 'in'} onPress={() => setMode('in')} />
      </View>
      <TextInput
        testID="email"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        style={styles.input}
        accessibilityLabel="Email"
      />
      <TextInput
        testID="password"
        value={password}
        onChangeText={setPassword}
        placeholder="Password (8+ characters)"
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
        textContentType={mode === 'up' ? 'newPassword' : 'password'}
        onSubmitEditing={submit}
        style={styles.input}
        accessibilityLabel="Password"
      />
      {message && (
        <Text variant="body" color={message.error ? colors.wrongDeep : colors.correctDeep}>
          {message.text}
        </Text>
      )}
      <Button
        title={mode === 'up' ? 'Create account' : 'Sign in'}
        onPress={submit}
        loading={busy}
        disabled={!email.includes('@') || password.length < 8}
        testID="auth-submit"
      />
    </Panel>
  );
}

function SignedIn({ email }: { email: string }) {
  const out = async () => {
    const pending = pendingChanges();
    if (
      pending > 0 &&
      !(await confirm(
        'Sign out?',
        `${pending} ${pending === 1 ? 'change hasn’t' : 'changes haven’t'} synced yet. If you sign out now, they’ll be lost.`,
        'Sign out',
      ))
    )
      return;
    await signOut();
  };
  const remove = async () => {
    if (
      !(await confirm(
        'Delete account?',
        'Your account and all your progress will be deleted. This can’t be undone.',
        'Delete',
      ))
    )
      return;
    try {
      await deleteAccount();
    } catch (e) {
      await confirm('Couldn’t delete the account', String(e instanceof Error ? e.message : e), 'OK');
    }
  };
  return (
    <Panel style={styles.card}>
      <Text variant="heading" color={colors.ink}>
        Signed in
      </Text>
      <Text variant="body" color={colors.inkSoft}>
        {email}
      </Text>
      <View style={styles.row}>
        <Button title="Sign out" kind="secondary" size="m" onPress={out} style={[styles.flex, styles.outlined]} />
        <Button title="Delete account" kind="danger" size="m" onPress={remove} style={styles.flex} />
      </View>
    </Panel>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { status, user } = useSyncStatus();
  const reset = useProgress((s) => s.reset);

  const onReset = async () => {
    if (await confirm('Reset progress?', 'Everything you’ve learned starts from zero, on all your devices.', 'Reset'))
      reset();
  };

  return (
    <Screen title="Account">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <SyncCard />
          {status !== 'disabled' &&
            (user && !user.anonymous && user.email ? <SignedIn email={user.email} /> : <AuthForm />)}
          <Panel style={styles.card}>
            <Text variant="heading" color={colors.ink}>
              Start over
            </Text>
            <Button title="Reset progress" kind="danger" size="m" icon="refresh" onPress={onReset} testID="reset" />
          </Panel>
          <View style={styles.credits}>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              Borders: Natural Earth (public domain). Country data: mledoze/countries (ODbL). Flags: flagcdn.com.
            </Text>
            <Text
              variant="caption"
              color={colors.white}
              style={styles.link}
              onPress={() => Linking.openURL('https://github.com/mledoze/countries')}
              accessibilityRole="link"
            >
              Data licenses
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
  credits: { gap: 4, paddingHorizontal: 4 },
  link: { textDecorationLine: 'underline' },
});
