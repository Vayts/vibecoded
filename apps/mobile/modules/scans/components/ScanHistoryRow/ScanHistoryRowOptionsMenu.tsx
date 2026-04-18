import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export interface ScanHistoryRowMenuAnchor {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface ScanHistoryRowMenuAction {
  disabled?: boolean;
  icon: ReactNode;
  key: string;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'destructive';
}

interface ScanHistoryRowOptionsMenuProps {
  actions: ScanHistoryRowMenuAction[];
  anchor: ScanHistoryRowMenuAnchor | null;
  children?: ReactNode;
  onClose: () => void;
  visible: boolean;
}

const MENU_HORIZONTAL_MARGIN = 12;
const MENU_CLOSE_DURATION = 80;
const MENU_OPEN_DURATION = 110;
const MENU_ITEM_HEIGHT = 44;
const MENU_ITEM_ICON_GAP = 16;
const MENU_OFFSET = 8;

function MenuItem({
  disabled = false,
  icon,
  label,
  onPress,
  tone = 'default',
}: Omit<ScanHistoryRowMenuAction, 'key'>) {
  const textColor = tone === 'destructive' ? COLORS.danger800 : COLORS.neutrals900;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`min-h-[44px] flex-row items-center justify-between px-4 ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Typography
        variant="buttonSmall"
        className="font-semibold"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ color: textColor, flexShrink: 1, fontSize: 14 }}
      >
        {label}
      </Typography>
      <View className="ml-4" style={{ marginLeft: MENU_ITEM_ICON_GAP }}>
        {icon}
      </View>
    </TouchableOpacity>
  );
}

export function ScanHistoryRowOptionsMenu({
  actions,
  anchor,
  children,
  onClose,
  visible,
}: ScanHistoryRowOptionsMenuProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [isRendered, setIsRendered] = useState(visible);
  const animationProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const pendingActionRef = useRef<(() => void) | null>(null);
  const itemCount = actions.length + (children ? 1 : 0);
  const estimatedMenuHeight = itemCount * MENU_ITEM_HEIGHT + Math.max(0, itemCount - 1);

  const runPendingAction = useCallback(() => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  }, []);

  const handleActionPress = useCallback(
    (action: ScanHistoryRowMenuAction) => {
      pendingActionRef.current = action.onPress;
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    animationProgress.stopAnimation();

    if (visible) {
      setIsRendered(true);
      requestAnimationFrame(() => {
        Animated.timing(animationProgress, {
          toValue: 1,
          duration: MENU_OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });

      return;
    }

    if (!isRendered) {
      return;
    }

    Animated.timing(animationProgress, {
      toValue: 0,
      duration: MENU_CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setIsRendered(false);
      runPendingAction();
    });
  }, [animationProgress, isRendered, runPendingAction, visible]);

  if (!anchor || !isRendered) {
    return null;
  }

  const preferredTop = anchor.y + anchor.height + MENU_OFFSET;
  const top =
    preferredTop + estimatedMenuHeight > windowHeight - MENU_HORIZONTAL_MARGIN
      ? Math.max(MENU_HORIZONTAL_MARGIN, anchor.y - estimatedMenuHeight - MENU_OFFSET)
      : preferredTop;
  const right = Math.max(MENU_HORIZONTAL_MARGIN, windowWidth - anchor.x - anchor.width);
  const maxWidth = windowWidth - right - MENU_HORIZONTAL_MARGIN;
  const menuAnimatedStyle = {
    opacity: animationProgress,
    transform: [
      {
        translateY: animationProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        }),
      },
      {
        scale: animationProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  return (
    <Modal transparent visible={isRendered} animationType="none" onRequestClose={onClose}>
      <View className="absolute inset-0">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <Animated.View
          className="absolute z-30 rounded-[16px] bg-white"
          onStartShouldSetResponder={() => true}
          style={{
            ...menuAnimatedStyle,
            elevation: 14,
            maxWidth,
            right,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.14,
            shadowRadius: 24,
            top,
          }}
        >
          {actions.map((action, index) => (
            <View key={action.key}>
              {index === actions.length - 1 && index > 0 ? <View className="h-px bg-gray-200" /> : null}
              <MenuItem
                disabled={action.disabled}
                icon={action.icon}
                label={action.label}
                onPress={() => {
                  handleActionPress(action);
                }}
                tone={action.tone}
              />
            </View>
          ))}

          {children ? (
            <>
              {actions.length > 0 ? <View className="h-px bg-gray-200" /> : null}
              {children}
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}