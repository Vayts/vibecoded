import { ActivityIndicator, Modal, Pressable, TouchableOpacity, View, Text } from 'react-native';

import { COLORS } from '../../constants/colors';
import { Typography } from '../Typography';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  errorMessage?: string | null;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  errorMessage,
  isPending = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={isPending ? undefined : onCancel}
    >
      <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: COLORS.overlay }}>
        <Pressable
          className="absolute inset-0"
          disabled={isPending}
          onPress={onCancel}
        />

        <View className="w-full max-w-[500px] rounded-[28px] bg-white px-6 pb-6 pt-6">
          <Text className="text-[16px] font-bold text-center text-neutrals-900">
            {title}
          </Text>

          <Typography
            variant="body"
            className="mt-2 mb-4 text-center leading-7 text-neutrals-700"
          >
            {description}
          </Typography>

          {errorMessage ? (
            <Typography variant="bodySecondary" className="mt-2 mb-4 text-center text-red-600">
              {errorMessage}
            </Typography>
          ) : null}

          <View className="flex-row gap-4">
            <TouchableOpacity
              activeOpacity={0.7}
              className="h-[44px] flex-1 items-center justify-center rounded-full border border-neutrals-300 bg-white"
              disabled={isPending}
              onPress={onCancel}
            >
              <Typography variant="button" className="text-neutrals-900">
                {cancelLabel}
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className={`h-[44px] flex-1 items-center justify-center rounded-full bg-danger-800 ${isPending ? 'opacity-70' : ''}`}
              disabled={isPending}
              onPress={onConfirm}
            >
              {isPending ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Typography variant="button" className="text-white">
                  {confirmLabel}
                </Typography>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}