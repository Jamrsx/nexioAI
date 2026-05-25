import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';
import type { DeviceSpecSummary } from '../types/models';

export const getDeviceSpecSummary = async (): Promise<DeviceSpecSummary> => {
  const totalBytes = await DeviceInfo.getTotalMemory();
  const totalRamMb = Math.max(1024, Math.round(totalBytes / (1024 * 1024)));

  let freeStorageMb: number | null = null;
  try {
    const free = await RNFS.getFSInfo();
    freeStorageMb = Math.round(free.freeSpace / (1024 * 1024));
  } catch (err) {
    console.log('[NexioAI] getFSInfo unavailable:', err);
  }

  const summary: DeviceSpecSummary = {
    totalRamMb,
    freeStorageMb,
    platform: `${Platform.OS} ${DeviceInfo.getSystemVersion()}`,
  };

  console.log('[NexioAI] Device specs:', summary);

  return summary;
};
