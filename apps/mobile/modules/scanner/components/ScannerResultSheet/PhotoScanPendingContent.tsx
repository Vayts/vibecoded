import { ActivityIndicator, Image, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { Section } from './ProductResultSections';

interface PhotoScanPendingContentProps {
  previewImageUri?: string | null;
  errorMessage?: string | null;
}

export function PhotoScanPendingContent({
  previewImageUri,
  errorMessage,
}: PhotoScanPendingContentProps) {
  return (
    <View>
      {previewImageUri ? (
        <View className="rounded-xl border border-gray-100 bg-white px-4 py-4">
          <Image
            source={{ uri: previewImageUri }}
            className="h-48 w-full rounded-xl bg-gray-100"
            resizeMode="cover"
          />
        </View>
      ) : null}

      <Section title={errorMessage ? 'Photo upload failed' : 'Analyzing photo'}>
        {errorMessage ? (
          <>
            <Typography variant="sectionTitle">We could not process this photo</Typography>
            <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-600">
              {errorMessage}
            </Typography>
            <Typography variant="bodySecondary" className="mt-4 leading-6 text-gray-500">
              Try another angle, better lighting, or a sharper front-of-pack photo.
            </Typography>
          </>
        ) : (
          <>
            <View className="flex-row items-center gap-3">
              <ActivityIndicator color={COLORS.primary} />
              <Typography variant="sectionTitle">Building your product analysis</Typography>
            </View>
            <Typography variant="bodySecondary" className="mt-3 leading-6 text-gray-600">
              The photo is being uploaded, identified, and matched to the personal analysis flow.
            </Typography>
            <View className="mt-4 gap-3 rounded-xl bg-gray-50 px-4 py-4">
              <Typography variant="bodySecondary" className="text-gray-700">
                1. Detect package and visible product clues
              </Typography>
              <Typography variant="bodySecondary" className="text-gray-700">
                2. Match the product and normalize its data
              </Typography>
              <Typography variant="bodySecondary" className="text-gray-700">
                3. Build your personal fit analysis
              </Typography>
            </View>
          </>
        )}
      </Section>
    </View>
  );
}