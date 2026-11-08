import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { AlertButton } from 'react-native';

import { Text } from '@/components/ui';
import { setAlertListener, type PendingAlert } from '@/lib/alert';
import { colors, fonts, radius, spacing } from '@/theme';

/** Muestra los avisos y menús de opciones con el diseño de la app */
export function AlertHost() {
  const [alert, setAlert] = useState<PendingAlert | null>(null);

  useEffect(() => {
    setAlertListener(setAlert);
    return () => setAlertListener(null);
  }, []);

  if (!alert) return null;

  const cancel = alert.buttons.find((b) => b.style === 'cancel');
  const actions = alert.buttons.filter((b) => b.style !== 'cancel');

  const press = (b?: AlertButton) => {
    setAlert(null);
    b?.onPress?.();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => press(cancel)}>
      <Pressable style={styles.backdrop} onPress={() => press(cancel)}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text variant="h2">{alert.title}</Text>
          {alert.message ? (
            <Text variant="body" color={colors.textMuted}>
              {alert.message}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            {actions.map((b, i) => {
              const destructive = b.style === 'destructive';
              const primary = !destructive && i === 0;
              return (
                <Pressable
                  key={b.text ?? i}
                  onPress={() => press(b)}
                  style={({ hovered }) => [
                    styles.button,
                    primary && styles.primary,
                    destructive && styles.destructive,
                    hovered && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.buttonText, destructive && { color: colors.danger }]}>{b.text}</Text>
                </Pressable>
              );
            })}
            {cancel ? (
              <Pressable onPress={() => press(cancel)} style={({ hovered }) => [styles.button, styles.cancel, hovered && { opacity: 0.8 }]}>
                <Text style={[styles.buttonText, { color: colors.textMuted }]}>{cancel.text ?? 'Cancelar'}</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  destructive: { backgroundColor: 'transparent', borderColor: colors.danger },
  cancel: { backgroundColor: 'transparent', borderColor: 'transparent' },
  buttonText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white, letterSpacing: 0.6, textTransform: 'uppercase' },
});
