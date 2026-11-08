import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { showAlert } from '@/lib/alert';
import { showError } from '@/lib/errors';
import { colors, fonts, spacing } from '@/theme';

import { accessCodeMessage } from './api';

/** Muestra el código de acceso de un cliente con botones para enviárselo */
export function AccessCodeCard({ name, email, code }: { name: string; email: string; code: string }) {
  const message = accessCodeMessage(name, email, code);

  /** Abre WhatsApp con el mensaje escrito; se elige el contacto allí (no guardamos teléfonos) */
  function sendWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  async function share() {
    // «Compartir» del navegador; si no existe, copiamos el mensaje al portapapeles
    try {
      if (navigator.share) {
        await navigator.share({ text: message });
        return;
      }
      await navigator.clipboard.writeText(message);
      showAlert('Copiado', 'Mensaje copiado. Pégalo en WhatsApp o en un email.');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return; // canceló el menú de compartir
      showError(e);
    }
  }

  return (
    <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <Text variant="label">Código de acceso</Text>
      <Text selectable style={{ fontFamily: fonts.display, fontSize: 36, letterSpacing: 6, color: colors.primaryBright }}>
        {code}
      </Text>
      <Text variant="small" align="center">
        {email}
      </Text>
      <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button title="Enviar por WhatsApp" icon="logo-whatsapp" onPress={sendWhatsApp} />
        <Button title="Otras opciones (email, copiar…)" icon="share-outline" variant="outline" onPress={share} />
      </View>
    </Card>
  );
}
