import { NativeModules } from 'react-native';

type NexioClipboardModule = {
  setString: (text: string) => Promise<void>;
};

const NexioClipboard = NativeModules.NexioClipboard as
  | NexioClipboardModule
  | undefined;

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!NexioClipboard?.setString) {
    console.log('[NexioAI] NexioClipboard native module not available');
    return false;
  }

  try {
    await NexioClipboard.setString(text);
    console.log('[NexioAI] Copied to clipboard, chars:', text.length);
    return true;
  } catch (error) {
    console.log('[NexioAI] Clipboard copy failed:', error);
    return false;
  }
}
