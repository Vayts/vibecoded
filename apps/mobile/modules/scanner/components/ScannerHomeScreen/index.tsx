import { useRouter } from 'expo-router';
import { Camera, ScanBarcode } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export function ScannerHomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white px-6 py-8">
      <View className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-blue-50" />
      <View className="absolute right-0 top-28 h-24 w-24 rounded-full bg-gray-50" />

      <View className="mt-10">
        <Typography variant="pageTitle" className="mb-3">
          Scan a product
        </Typography>
        <Typography variant="bodySecondary" className="max-w-[320px] leading-6">
          Choose how you want to start. You can scan a barcode or capture a product photo and review
          the mocked result in a bottom sheet.
        </Typography>
      </View>

      <View className="mt-8 gap-4">
        <View className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <ScanBarcode color={COLORS.primary} size={28} />
          </View>
          <Typography variant="sectionTitle" className="mb-2">
            Scan barcode
          </Typography>
          <Typography variant="bodySecondary" className="mb-5 leading-6">
            Use the camera to detect a barcode and preview the mocked lookup payload.
          </Typography>
          <Button
            fullWidth
            label="Scan barcode"
            onPress={() => {
              router.push('/scanner/barcode');
            }}
          />
        </View>

        <View className="rounded-xl border border-gray-100 bg-white px-5 py-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Camera color={COLORS.primary} size={28} />
          </View>
          <Typography variant="sectionTitle" className="mb-2">
            Take product photo
          </Typography>
          <Typography variant="bodySecondary" className="mb-5 leading-6">
            Capture a product photo and open a reusable result sheet without any backend upload.
          </Typography>
          <Button
            fullWidth
            label="Take product photo"
            onPress={() => {
              router.push('/scanner/photo');
            }}
          />
        </View>
      </View>
    </View>
  );
}
