import type { ModelCatalogEntry } from '../types/models';

const HF_BASE =
  'https://huggingface.co/mradermacher/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main';

/** Curated GGUF models — all run via llama.cpp on device */
export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: 'tinyllama-q2',
    name: 'TinyLlama Q2_K',
    description: 'Smallest. Fastest on low-RAM phones. Lower reply quality.',
    filename: 'TinyLlama-1.1B-Chat-v1.0.Q2_K.gguf',
    downloadUrl: `${HF_BASE}/TinyLlama-1.1B-Chat-v1.0.Q2_K.gguf`,
    sizeMb: 520,
    minRamMb: 2048,
    contextSize: 2048,
    maxPredict: 256,
    tier: 'light',
  },
  {
    id: 'tinyllama-q4',
    name: 'TinyLlama Q4_K_M',
    description: 'Balanced speed and quality. Good default for most devices.',
    filename: 'TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf',
    downloadUrl: `${HF_BASE}/TinyLlama-1.1B-Chat-v1.0.Q4_K_M.gguf`,
    sizeMb: 640,
    minRamMb: 3072,
    contextSize: 2048,
    maxPredict: 256,
    tier: 'balanced',
  },
  {
    id: 'tinyllama-q5',
    name: 'TinyLlama Q5_K_M',
    description: 'Higher quality replies. Needs more RAM and storage.',
    filename: 'TinyLlama-1.1B-Chat-v1.0.Q5_K_M.gguf',
    downloadUrl: `${HF_BASE}/TinyLlama-1.1B-Chat-v1.0.Q5_K_M.gguf`,
    sizeMb: 750,
    minRamMb: 4096,
    contextSize: 2048,
    maxPredict: 256,
    tier: 'quality',
  },
  {
    id: 'tinyllama-q8',
    name: 'TinyLlama Q8_0',
    description: 'Best quality in this family. For phones with 6GB+ RAM only.',
    filename: 'TinyLlama-1.1B-Chat-v1.0.Q8_0.gguf',
    downloadUrl: `${HF_BASE}/TinyLlama-1.1B-Chat-v1.0.Q8_0.gguf`,
    sizeMb: 1100,
    minRamMb: 6144,
    contextSize: 2048,
    maxPredict: 256,
    tier: 'quality',
  },
];

export const DEFAULT_MODEL_ID = 'tinyllama-q4';

export const getCatalogEntry = (id: string): ModelCatalogEntry | undefined =>
  MODEL_CATALOG.find(entry => entry.id === id);

export const getDefaultCatalogEntry = (): ModelCatalogEntry =>
  getCatalogEntry(DEFAULT_MODEL_ID) ?? MODEL_CATALOG[1];

/** @deprecated use catalog */
export const DEFAULT_MODEL_FILENAME = getDefaultCatalogEntry().filename;

export const DEFAULT_MODEL_DOWNLOAD_URL = getDefaultCatalogEntry().downloadUrl;

export const MODEL_CONTEXT_SIZE = getDefaultCatalogEntry().contextSize;

export const MODEL_MAX_PREDICT = getDefaultCatalogEntry().maxPredict;
