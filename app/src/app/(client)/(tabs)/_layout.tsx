import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, useTabScreenOptions } from '@/components/TabBar';

export default function ClientTabs() {
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="today"
        options={{ title: 'Hoy', tabBarIcon: tabIcon('flash-outline') }}
      />
      <Tabs.Screen
        name="week"
        options={{ title: 'Semana', tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progreso', tabBarIcon: tabIcon('stats-chart-outline') }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person-circle-outline') }}
      />
    </Tabs>
  );
}
