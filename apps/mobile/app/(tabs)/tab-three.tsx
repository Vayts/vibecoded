import { View } from 'react-native';
import { useAuthStore } from '../../shared/stores/authStore';
import { Typography } from '../../shared/components/Typography';
import { Button } from '../../shared/components/Button';

export default function TabThreeScreen() {
  const { user, signOut, isLoading } = useAuthStore();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Typography variant="hero" className="mb-3 text-center">
        Tab 3
      </Typography>
      <Typography variant="bodySecondary" className="mb-8 text-center">
        {user ? `Logged in as ${user.email}` : 'Authenticated area'}
      </Typography>
      <Button
        label="Sign out"
        onPress={() => void signOut()}
        loading={isLoading}
        variant="secondary"
        fullWidth
      />
      <View className="mt-4">
        <Typography variant="caption" className="text-center">
          Use this tab for account actions in the template.
        </Typography>
      </View>
    </View>
  );
}
