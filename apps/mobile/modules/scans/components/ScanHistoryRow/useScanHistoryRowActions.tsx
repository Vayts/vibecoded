import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { ArrowLeftRight, Heart, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useDeleteScanMutation } from '../../hooks/useDeleteScanMutation';
import type {
  ScanHistoryRowMenuAction,
  ScanHistoryRowMenuAnchor,
} from './ScanHistoryRowOptionsMenu';

interface UseScanHistoryRowActionsParams {
  isFavourite: boolean;
  item: ScanHistoryItem;
  onToggleFavourite: (productId: string, currentlyFavourite: boolean) => void;
}

export function useScanHistoryRowActions({
  isFavourite,
  item,
  onToggleFavourite,
}: UseScanHistoryRowActionsParams) {
  const deleteScanMutation = useDeleteScanMutation();
  const menuTriggerRef = useRef<View>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ScanHistoryRowMenuAnchor | null>(null);
  const productId = item.product?.id ?? null;
  const canCompare = item.type === 'product' && Boolean(item.product?.barcode);
  const canToggleFavourite = Boolean(productId);

  const closeMenu = useCallback(() => {
    setIsMenuVisible(false);
  }, []);

  const openMenu = useCallback(() => {
    menuTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setIsMenuVisible(true);
    });
  }, []);

  const handleToggleFavourite = useCallback(() => {
    if (!productId) {
      return;
    }

    onToggleFavourite(productId, isFavourite);
  }, [isFavourite, onToggleFavourite, productId]);

  const handleCompare = useCallback(() => {
    if (!canCompare || !item.product) {
      return;
    }

    void SheetManager.show(SheetsEnum.CompareProductPickerSheet, {
      payload: {
        currentProduct: {
          barcode: item.product.barcode,
          productId: item.product.id,
          productName: item.product.product_name,
        },
      },
    });
  }, [canCompare, item.product]);

  const handleDeletePress = useCallback(() => {
    setDeleteErrorMessage(null);
    setIsDeleteDialogVisible(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    if (deleteScanMutation.isPending) {
      return;
    }

    setDeleteErrorMessage(null);
    setIsDeleteDialogVisible(false);
  }, [deleteScanMutation.isPending]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteErrorMessage(null);

    try {
      await deleteScanMutation.mutateAsync(item.id);
      setIsDeleteDialogVisible(false);
    } catch (error) {
      setDeleteErrorMessage(error instanceof Error ? error.message : 'Unable to delete entry');
    }
  }, [deleteScanMutation, item.id]);

  const menuActions: ScanHistoryRowMenuAction[] = [
    ...(canToggleFavourite
      ? [
          {
            key: 'favourite',
            label: isFavourite ? 'Remove from favourites' : 'Add to favourites',
            icon: (
              <Heart
                size={20}
                color={COLORS.neutrals700}
                fill={isFavourite ? COLORS.neutrals700 : 'none'}
                strokeWidth={1.9}
              />
            ),
            onPress: handleToggleFavourite,
          },
        ]
      : []),
    ...(canCompare
      ? [
          {
            key: 'compare',
            label: 'Compare',
            icon: <ArrowLeftRight size={20} color={COLORS.neutrals700} strokeWidth={1.9} />,
            onPress: handleCompare,
          },
        ]
      : []),
    {
      key: 'delete',
      label: 'Delete from history',
      icon: <Trash2 size={20} color={COLORS.danger800} strokeWidth={1.9} />,
      onPress: handleDeletePress,
      tone: 'destructive',
    },
  ];

  return {
    closeMenu,
    deleteErrorMessage,
    deleteScanMutation,
    handleDeleteCancel,
    handleDeleteConfirm,
    isDeleteDialogVisible,
    isMenuVisible,
    menuActions,
    menuAnchor,
    menuTriggerRef,
    openMenu,
  };
}