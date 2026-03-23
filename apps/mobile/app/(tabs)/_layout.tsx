import { Redirect, Tabs } from 'expo-router';
import { Home, BookOpen, User } from 'lucide-react-native';
import { ScreenSpinner } from '../../shared/components/ScreenSpinner';
import { COLORS } from '../../shared/constants/colors';
import { useAuthStore } from '../../shared/stores/authStore';

export default function TabsLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <ScreenSpinner />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: {
          borderTopColor: COLORS.gray200,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tab 1',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tab-two"
        options={{
          title: 'Tab 2',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tab-three"
        options={{
          title: 'Tab 3',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
