import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface EditAvatarOptionsMenuProps {
  canDelete: boolean;
  onDelete: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

export function EditAvatarOptionsMenu({
  canDelete,
  onDelete,
  onSelectCamera,
  onSelectGallery,
}: EditAvatarOptionsMenuProps) {
  return (
    <View
      className="absolute top-[92px] z-30 w-[250px] rounded-[16px] bg-white"
      onStartShouldSetResponder={() => true}
      style={{
        elevation: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        className="min-h-[40px] flex-row items-center justify-between px-4"
        onPress={onSelectGallery}
      >
        <Typography variant="body" className="font-semibold text-neutrals-900">
          Select from gallery
        </Typography>
        <ImageIcon color={COLORS.neutrals700} size={20} strokeWidth={1.9} />
      </TouchableOpacity>

      <View className="h-px bg-gray-200" />

      <TouchableOpacity
        activeOpacity={0.7}
        className="min-h-[40px] flex-row items-center justify-between px-4"
        onPress={onSelectCamera}
      >
        <Typography variant="body" className="font-semibold text-neutrals-900">
          Take a photo
        </Typography>
        <Camera color={COLORS.neutrals700} size={20} strokeWidth={1.9} />
      </TouchableOpacity>

      {canDelete ? (
        <>
          <View className="h-px bg-gray-200" />
          <TouchableOpacity
            activeOpacity={0.7}
            className="min-h-[40px] flex-row items-center justify-between px-4"
            onPress={onDelete}
          >
            <Typography variant="body" className="font-semibold text-red-600">
              Delete image
            </Typography>
            <Trash2 color={COLORS.danger} size={20} strokeWidth={1.9} />
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}
