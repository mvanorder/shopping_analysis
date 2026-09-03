import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { Button, HelperText, Snackbar, Surface, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/features/marketing/components/BrandMark';
import { heading, layout, radius, spacing, useAppTheme, useResponsive } from '@/theme';

/** The credentials a submitted, client-validated login form carries. */
export type LoginCredentials = { email: string; password: string };

type LoginScreenProps = {
  /**
   * Called with the validated credentials when the form is submitted.
   *
   * Not wired to the backend yet: the `/login` route leaves this undefined and
   * the screen acknowledges a valid submission with a Snackbar instead of a
   * dead button. Swap in the real sign-in call (`POST /auth/login`, then store
   * the token pair) here once the API client exists; nothing else on the
   * screen needs to change.
   */
  onSubmit?: (credentials: LoginCredentials) => void;
};

// Deliberately loose: a login form should reject "obviously not an email"
// (no `@`, no domain) client-side, but the server is the authority on whether
// an address exists. A stricter regex here only risks turning away valid
// addresses the backend would accept.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    errors.email = 'Enter your email address.';
  } else if (!EMAIL_RE.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (password.length === 0) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

/**
 * Email + password sign-in screen (route: `/login`).
 *
 * Client-side validation only gates the shape of the input; the real
 * credential check happens server-side once {@link LoginScreenProps.onSubmit}
 * is wired to `POST /auth/login`. Renders as a centred card on wide viewports
 * and a full-width column on phones, and holds the fields clear of the
 * on-screen keyboard on native.
 */
export function LoginScreen({ onSubmit }: LoginScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();

  const passwordRef = useRef<RNTextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [ackVisible, setAckVisible] = useState(false);

  // After the first submit, keep the messages honest as the user fixes each
  // field rather than leaving a stale error under a now-valid input.
  const liveErrors = useMemo(
    () => (submitted ? validate(email, password) : errors),
    [submitted, email, password, errors],
  );

  const handleSubmit = useCallback(() => {
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    setSubmitted(true);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (onSubmit) {
      onSubmit({ email: email.trim(), password });
    } else {
      setAckVisible(true);
    }
  }, [email, password, onSubmit]);

  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: gutter + Math.max(insets.left, insets.right),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Surface elevation={1} style={styles.card}>
            <View style={styles.brand}>
              <BrandMark />
            </View>

            <Text
              {...heading(1)}
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}
            >
              Welcome back
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Sign in to pick up where your shopping history left off.
            </Text>

            <View>
              <TextInput
                mode="outlined"
                label="Email"
                value={email}
                onChangeText={(next) => {
                  setEmail(next);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={liveErrors.email != null}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                accessibilityLabel="Email"
              />
              <HelperText type="error" visible={liveErrors.email != null}>
                {liveErrors.email ?? ' '}
              </HelperText>
            </View>

            <View>
              <TextInput
                ref={passwordRef}
                mode="outlined"
                label="Password"
                value={password}
                onChangeText={(next) => {
                  setPassword(next);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                onSubmitEditing={handleSubmit}
                error={liveErrors.password != null}
                secureTextEntry={secure}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                accessibilityLabel="Password"
                right={
                  <TextInput.Icon
                    icon={secure ? 'eye' : 'eye-off'}
                    onPress={() => setSecure((prev) => !prev)}
                    accessibilityLabel={secure ? 'Show password' : 'Hide password'}
                    forceTextInputFocus={false}
                  />
                }
              />
              <HelperText type="error" visible={liveErrors.password != null}>
                {liveErrors.password ?? ' '}
              </HelperText>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submit}
              contentStyle={styles.submitContent}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              Log in
            </Button>
          </Surface>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              New to Shopping Analysis?
            </Text>
            <Button
              mode="text"
              compact
              onPress={() => router.replace('/')}
              accessibilityRole="button"
              accessibilityLabel="Get started"
            >
              Get started
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={ackVisible}
        onDismiss={() => setAckVisible(false)}
        duration={4000}
        action={{ label: 'OK', onPress: () => setAckVisible(false) }}
        style={styles.snackbar}
        wrapperStyle={{ bottom: insets.bottom }}
      >
        Sign-in isn&apos;t wired up yet — the backend API isn&apos;t connected.
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  submit: {
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  submitContent: {
    height: layout.minTouchTarget,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    marginTop: spacing.lg,
  },
  snackbar: {
    alignSelf: 'center',
    maxWidth: 520,
  },
});
