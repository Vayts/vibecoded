import type { ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../../../shared/components/Button';
import { ConfirmationDialog } from '../../../../shared/components/ConfirmationDialog';
import { useDeleteComparisonMutation } from '../../hooks/useDeleteComparisonMutation';
import { useDeleteScanMutation } from '../../hooks/useDeleteScanMutation';

interface DeleteHistoryActionProps {
  entryId: string;
  entryType: 'scan' | 'comparison';
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel?: string;
  onDeleted?: () => void;
  renderTrigger?: (props: { disabled: boolean; onPress: () => void }) => ReactNode;
}

export function DeleteHistoryAction({
  entryId,
  entryType,
  buttonLabel,
  dialogTitle,
  dialogDescription,
  confirmLabel = 'Delete',
  onDeleted,
  renderTrigger,
}: DeleteHistoryActionProps) {
  const deleteScanMutation = useDeleteScanMutation();
  const deleteComparisonMutation = useDeleteComparisonMutation();
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeMutation =
    entryType === 'comparison' ? deleteComparisonMutation : deleteScanMutation;

  const handleOpen = () => {
    setErrorMessage(null);
    setIsDialogVisible(true);
  };

  const handleClose = () => {
    if (activeMutation.isPending) {
      return;
    }

    setIsDialogVisible(false);
    setErrorMessage(null);
  };

  const handleConfirm = async () => {
    setErrorMessage(null);

    try {
      await activeMutation.mutateAsync(entryId);
      setIsDialogVisible(false);
      onDeleted?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete entry');
    }
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ disabled: activeMutation.isPending, onPress: handleOpen })
      ) : (
        <View className="mt-4">
          <Button
            fullWidth
            label={buttonLabel}
            variant="destructive"
            disabled={activeMutation.isPending}
            onPress={handleOpen}
          />
        </View>
      )}

      <ConfirmationDialog
        visible={isDialogVisible}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={confirmLabel}
        errorMessage={errorMessage}
        isPending={activeMutation.isPending}
        onCancel={handleClose}
        onConfirm={() => {
          void handleConfirm();
        }}
      />
    </>
  );
}