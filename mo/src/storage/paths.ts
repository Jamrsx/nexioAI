import RNFS from 'react-native-fs';

const ROOT_DIR_NAME = 'NexioAI';

export const storagePaths = {
  root: '',
  models: '',
  cache: '',
  data: '',
  downloads: '',
  logs: '',
  databaseFile: '',
};

/**
 * Creates NexioAI folders under app-private storage.
 */
export const initializeStoragePaths = async (): Promise<typeof storagePaths> => {
  const root = `${RNFS.DocumentDirectoryPath}/${ROOT_DIR_NAME}`;

  storagePaths.root = root;
  storagePaths.models = `${root}/models`;
  storagePaths.cache = `${root}/cache`;
  storagePaths.data = `${root}/data`;
  storagePaths.downloads = `${root}/downloads`;
  storagePaths.logs = `${root}/logs`;
  storagePaths.databaseFile = `${root}/data/nexio.db`;

  const dirs = [
    storagePaths.root,
    storagePaths.models,
    storagePaths.cache,
    storagePaths.data,
    storagePaths.downloads,
    storagePaths.logs,
  ];

  for (const dir of dirs) {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
      console.log('[NexioAI] Created directory:', dir);
    }
  }

  console.log('[NexioAI] Storage ready at:', storagePaths.root);

  return storagePaths;
};

/** Idempotent — safe to call before downloads or DB access. */
export const ensureStorageReady = async (): Promise<typeof storagePaths> => {
  if (!storagePaths.data) {
    return initializeStoragePaths();
  }

  await ensureDirectory(storagePaths.root);
  await ensureDirectory(storagePaths.models);
  await ensureDirectory(storagePaths.data);

  return storagePaths;
};

/** Creates a directory and any missing parents (Android mkdir is not recursive). */
export const ensureDirectory = async (dirPath: string): Promise<void> => {
  if (!dirPath) {
    throw new Error('Directory path is empty — call ensureStorageReady() first.');
  }

  if (await RNFS.exists(dirPath)) {
    return;
  }

  const parent = dirPath.replace(/\/[^/]+$/, '');
  if (parent && parent !== dirPath) {
    await ensureDirectory(parent);
  }

  await RNFS.mkdir(dirPath);
  console.log('[NexioAI] Created directory:', dirPath);
};
