import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { Text } from './Text';

interface Option<T> {
  value: T;
  label: string;
}

/** Desplegable con buscador (ventana con la lista de opciones) */
export function Select<T extends string | number>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecciona…',
  searchable = true,
  disabled,
}: {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, q]);

  const close = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={({ hovered }) => [styles.field, hovered && !disabled && { borderColor: colors.primary }, disabled && { opacity: 0.6 }]}
      >
        <Text style={[styles.fieldText, !selected && { color: colors.textFaint }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <Modal transparent visible animationType="fade" onRequestClose={close}>
          <Pressable style={styles.backdrop} onPress={close}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Text variant="h3" style={{ flex: 1 }}>
                  {label ?? 'Selecciona'}
                </Text>
                <Pressable onPress={close} hitSlop={10} accessibilityLabel="Cerrar">
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
              {searchable ? (
                <View style={styles.search}>
                  <Ionicons name="search" size={16} color={colors.textFaint} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Buscar"
                    placeholderTextColor={colors.textFaint}
                    style={styles.searchInput}
                    autoFocus
                  />
                </View>
              ) : null}
              <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
                {filtered.map((o) => {
                  const active = o.value === value;
                  return (
                    <Pressable
                      key={String(o.value)}
                      onPress={() => {
                        onChange(o.value);
                        close();
                      }}
                      style={({ hovered }) => [styles.option, hovered && { backgroundColor: colors.surfaceAlt }, active && styles.optionActive]}
                    >
                      <Text style={[styles.optionText, active && { color: colors.white }]}>{o.label}</Text>
                      {active ? <Ionicons name="checkmark" size={18} color={colors.primaryBright} /> : null}
                    </Pressable>
                  );
                })}
                {!filtered.length ? (
                  <Text variant="small" align="center" style={{ padding: spacing.lg }}>
                    Sin resultados
                  </Text>
                ) : null}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  fieldText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
  },
  searchInput: { flex: 1, minHeight: 44, color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
});
