import { useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  Platform,
} from 'react-native';

/**
 * Fine-tune input bar vs keyboard (pixels).
 * Positive = more space above keyboard. Negative = move input down (closer).
 * ~1 cm on most phones ≈ 28–40 px — try -28, then -20 or -36 until it looks right.
 */
export const KEYBOARD_COMPOSER_EXTRA = Platform.OS === 'android' ? -2 : 8;

/** Approximate composer bar height for list bottom padding. */
export const COMPOSER_DOCK_HEIGHT = 68;

/**
 * Bottom offset for the docked composer (distance from screen bottom).
 */
export function getComposerBottomOffset(
  keyboardObstruction: number,
  safeBottom: number,
): number {
  if (keyboardObstruction > 0) {
    return Math.max(0, keyboardObstruction + KEYBOARD_COMPOSER_EXTRA);
  }

  return Math.max(safeBottom, 8);
};

/**
 * Distance from the bottom of the window to the top of the keyboard (IME).
 * Uses screenY so the suggestion/toolbar row is included — do not also add a large EXTRA.
 */
const measureKeyboardObstruction = (event: KeyboardEvent): number => {
  const { screenY } = event.endCoordinates;
  const windowHeight = Dimensions.get('window').height;
  return Math.max(0, windowHeight - screenY);
};

/**
 * Height of UI obstructed from the bottom of the window when the keyboard is open.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const next = measureKeyboardObstruction(event);
      setHeight(next);
      console.log('[NexioAI] Keyboard open, dock offset base:', next, {
        screenY: event.endCoordinates.screenY,
        reportedHeight: event.endCoordinates.height,
        extra: KEYBOARD_COMPOSER_EXTRA,
        total: next + KEYBOARD_COMPOSER_EXTRA,
      });
    };

    const onHide = () => {
      setHeight(0);
      console.log('[NexioAI] Keyboard closed — composer returns to bottom');
    };

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
