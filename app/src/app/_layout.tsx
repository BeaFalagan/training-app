import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertHost } from '@/components/AlertHost';
import { Logo, Text } from '@/components/ui';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/query';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AlertHost />
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {isSupabaseConfigured ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="workout/player/[dayId]" options={{ animation: 'fade' }} />
                <Stack.Screen name="workout/finish" options={{ animation: 'fade' }} />
              </Stack>
            ) : (
              <MissingConfig />
            )}
          </View>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function MissingConfig() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <Logo size={120} />
      <Text variant="h2" align="center">
        Falta configurar Supabase
      </Text>
      <Text variant="small" align="center">
        Copia app/.env.example a app/.env.local, rellena EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY y
        reinicia con «npx expo start --clear».
      </Text>
    </View>
  );
}
