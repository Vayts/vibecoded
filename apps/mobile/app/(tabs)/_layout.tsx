import { Redirect, Tabs } from 'expo-router';
import { ClipboardList, User } from 'lucide-react-native';
import { ScreenSpinner } from '../../shared/components/ScreenSpinner';
import { useAuthStore } from '../../shared/stores/authStore';
import { OnboardingGate } from '../../modules/onboarding/components/OnboardingGate';
import { CustomTabBar } from '../../shared/components/CustomTabBar';
import { useEffect } from 'react';
import Purchases from 'react-native-purchases';

export default function TabsLayout() {
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    initUserPurchases();
  }, [user]);

  const initUserPurchases = async () => {
    if (user?.id) {
      await Purchases.logIn(user.id);
    }
  }

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
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="tab-two"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="scans"
          options={{
            title: "Discovery",
            tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Account',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </OnboardingGate>
  );
}
