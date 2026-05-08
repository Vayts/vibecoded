import React, { useState } from 'react';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '../../../../shared/components/TextField';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';

export interface DeleteAccountSheetPayload {
  onConfirm: () => Promise<void>;
}

const DELETE_CONFIRMATION_VALUE = 'delete';

export function DeleteAccountSheet() {
  const payload = useSheetPayload(
    SheetsEnum.DeleteAccountSheet,
  ) as DeleteAccountSheetPayload | null;
  const insets = useSafeAreaInsets();
  const [confirmationValue, setConfirmationValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!payload) {
    return null;
  }

  const isConfirmationValid = confirmationValue.trim().toLowerCase() === DELETE_CONFIRMATION_VALUE;

  const resetState = () => {
    setConfirmationValue('');
    setErrorMessage(null);
    setIsPending(false);
  };

  const handleClose = () => {
    if (isPending) {
      return;
    }

    void SheetManager.hide(SheetsEnum.DeleteAccountSheet);
  };

  const handleConfirm = async () => {
    if (!isConfirmationValid || isPending) {
      return;
    }

    setErrorMessage(null);
    setIsPending(true);

    try {
      await payload.onConfirm();
      resetState();
      void SheetManager.hide(SheetsEnum.DeleteAccountSheet);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete account');
      setIsPending(false);
    }
  };

  return (
    <ActionSheet
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
      gestureEnabled={!isPending}
      onClose={resetState}
      useBottomSafeAreaPadding={false}
    >
      <View className="bg-white px-4 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <Text className="text-center text-[20px] font-bold text-neutrals-900">Delete account</Text>

        <Typography variant="body" className="mt-3 text-center text-neutrals-700">
          This permanently deletes your account, profile, family members, scans, and saved data.
          Type DELETE to confirm.
        </Typography>

        <TextField
          accessibilityLabel="Delete account confirmation input"
          autoCapitalize="characters"
          autoCorrect={false}
          containerClassName="mt-5"
          editable={!isPending}
          label="Type DELETE to confirm"
          onChangeText={(value) => {
            setConfirmationValue(value);
            if (errorMessage) {
              setErrorMessage(null);
            }
          }}
          placeholder="DELETE"
          returnKeyType="done"
          showLockIcon={false}
          value={confirmationValue}
        />

        {errorMessage ? (
          <Typography variant="bodySecondary" className="mt-3 text-center text-red-600">
            {errorMessage}
          </Typography>
        ) : null}

        <View className="mt-5 flex-row gap-3">
          <TouchableOpacity
            accessibilityLabel="Cancel account deletion"
            accessibilityRole="button"
            activeOpacity={0.7}
            className="h-[44px] flex-1 items-center justify-center rounded-full border border-neutrals-300 bg-white"
            disabled={isPending}
            onPress={handleClose}
          >
            <Typography variant="button" className="text-neutrals-900">
              Cancel
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Confirm account deletion"
            accessibilityRole="button"
            activeOpacity={0.7}
            className="h-[44px] flex-1 items-center justify-center rounded-full bg-danger-800"
            disabled={!isConfirmationValid || isPending}
            style={{
              opacity: !isConfirmationValid || isPending ? 0.4 : 1,
            }}
            onPress={() => {
              void handleConfirm();
            }}
          >
            {isPending ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Typography variant="button" className="text-white">
                Confirm
              </Typography>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ActionSheet>
  );
}
