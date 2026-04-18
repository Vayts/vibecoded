import { useRouter } from 'expo-router';

import { DeleteHistoryAction } from '../../../../scans/components/DeleteHistoryAction';

interface ComparisonDeleteActionProps {
  comparisonId?: string;
  scanId?: string;
}

export function ComparisonDeleteAction({
  comparisonId,
  scanId,
}: ComparisonDeleteActionProps) {
  const router = useRouter();
  const entryId = comparisonId ?? scanId;
  const entryType = comparisonId ? 'comparison' : 'scan';

  if (!entryId) {
    return null;
  }

  return (
    <DeleteHistoryAction
      entryId={entryId}
      entryType={entryType}
      buttonLabel="Delete from history"
      dialogTitle="Delete comparison?"
      dialogDescription="This comparison and its result will be removed from your history."
      confirmLabel="Delete"
      onDeleted={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/(tabs)/scans');
      }}
    />
  );
}