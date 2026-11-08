import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const bg: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.white,
  outline: 'transparent',
  ghost: 'transparent',
  danger: 'transparent',
};
const fg: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.black,
  outline: colors.text,
  ghost: colors.textMuted,
  danger: colors.danger,
};
const heights: Record<Size, number> = { sm: 36, md: 48, lg: 58 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth = true,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          backgroundColor: bg[variant],
          borderColor: variant === 'outline' ? colors.border : variant === 'danger' ? colors.danger : 'transparent',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={fg[variant]} /> : null}
          <Text
            style={{
              color: fg[variant],
              fontFamily: size === 'lg' ? fonts.display : fonts.bold,
              fontSize: size === 'sm' ? 13 : size === 'lg' ? 18 : 15,
              letterSpacing: size === 'lg' ? 1.5 : 0.6,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.text,
  size = 22,
  background = colors.surfaceAlt,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  size?: number;
  background?: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.icon,
        { width: size + 20, height: size + 20, backgroundColor: background, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
