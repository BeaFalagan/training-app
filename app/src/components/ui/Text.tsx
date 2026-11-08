import { Text as RNText, StyleSheet, View, type TextProps, type TextStyle } from 'react-native';

import { colors, type as typeScale, type TextVariant } from '@/theme';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function Text({ variant = 'body', color, align, style, ...rest }: Props) {
  // Si se cambia el tamaño de letra sin indicar altura de línea, la ajustamos
  // para que no se herede la de la variante y se corte el texto.
  const custom = StyleSheet.flatten(style);
  const autoLineHeight =
    custom?.fontSize && custom.lineHeight === undefined ? { lineHeight: Math.round(custom.fontSize * 1.2) } : null;
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant] as TextStyle,
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
        autoLineHeight,
      ]}
    />
  );
}

/** Etiqueta con líneas a los lados: ——— ENTRENO ——— */
export function BrandDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: 2, backgroundColor: colors.text }} />
      <Text variant="label" color={colors.text} style={{ letterSpacing: 5 }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 2, backgroundColor: colors.text }} />
    </View>
  );
}
