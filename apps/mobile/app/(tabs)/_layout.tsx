import { Redirect, Tabs } from 'expo-router';
import { ClipboardList, ScanLine, User } from 'lucide-react-native';
import { ScreenSpinner } from '../../shared/components/ScreenSpinner';
import { COLORS } from '../../shared/constants/colors';
import { useAuthStore } from '../../shared/stores/authStore';
import { OnboardingGate } from '../../modules/onboarding/components/OnboardingGate';

export default function TabsLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <ScreenSpinner />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <OnboardingGate>
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
            href: null,
          }}
        />
        <Tabs.Screen
          name="scanner/index"
          options={{
            title: 'Scanner',
            tabBarIcon: ({ color, size }) => <ScanLine size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="scans"
          options={{
            title: 'Scans',
            tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tab-two"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </OnboardingGate>
  );
}
