import { Trash2 } from 'lucide-react-native';
import { SheetManager } from 'react-native-actions-sheet';

import { COLORS } from '../../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../../shared/types/sheets';
import { DeleteHistoryAction } from '../../../../scans/components/DeleteHistoryAction';
import { ResultSheetActionButton } from '../ResultSheetActionButton';

interface ScanDeleteActionProps {
  scanId?: string;
}

export function ScanDeleteAction({ scanId }: ScanDeleteActionProps) {
  if (!scanId) {
    return null;
  }

  return (
    <DeleteHistoryAction
      entryId={scanId}
      entryType="scan"
      buttonLabel="Delete from history"
      dialogTitle="Delete from history?"
      dialogDescription="This scan and its analysis results will be removed from your history."
      confirmLabel="Delete"
      renderTrigger={({ disabled, onPress }) => (
        <ResultSheetActionButton
          label="Delete from history"
          tone="destructive"
          disabled={disabled}
          icon={<Trash2 color={COLORS.danger800} size={18} strokeWidth={1.9} />}
          onPress={onPress}
        />
      )}
      onDeleted={() => {
        void SheetManager.hide(SheetsEnum.ScannerResultSheet);
      }}
    />
  );
}