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
