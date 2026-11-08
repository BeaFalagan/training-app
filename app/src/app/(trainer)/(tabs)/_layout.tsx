import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabScreenOptions } from '@/components/TabBar';

export default function TrainerTabs() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Inicio', tabBarIcon: tabIcon('grid-outline') }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clientes', tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Ejercicios', tabBarIcon: tabIcon('barbell-outline') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person-circle-outline') }}
      />
    </Tabs>
  );
}
