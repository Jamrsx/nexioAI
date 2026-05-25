import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModelProgressBar } from '../models/ModelProgressBar';
import { PrimaryButton } from '../PrimaryButton';
import { ensureDatabaseReady } from '../../db/database';
import { useModelDownloads } from '../../context/ModelDownloadContext';
import { subscribeModelDownloads } from '../../services/modelDownloadManager';
import { getDeviceSpecSummary } from '../../services/deviceSpecs';
import { buildModelCatalogItems } from '../../services/modelRecommendation';
import {
  clearLlamaConversationCache,
  releaseLlama,
  initLlama,
} from '../../services/llamaService';
import { setActiveModel } from '../../services/modelStorage';
import type { ModelCatalogItem } from '../../types/models';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onActiveModelChange: (name: string) => void;
};

export function ChatModelPickerModal({
  visible,
  onClose,
  onActiveModelChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const { getDownload, startDownload, downloads } = useModelDownloads();
  const [items, setItems] = useState<ModelCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      await ensureDatabaseReady();
      const specs = await getDeviceSpecSummary();
      const catalog = await buildModelCatalogItems(specs);
      setItems(catalog);
      console.log('[NexioAI] Chat model picker loaded:', catalog.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadCatalog();
    }
  }, [visible, loadCatalog]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    return subscribeModelDownloads(() => {
      loadCatalog();
    });
  }, [visible, loadCatalog, downloads.length]);

  const activateModel = async (item: ModelCatalogItem) => {
    setSwitchingId(item.id);
    try {
      await setActiveModel(item.id);
      await releaseLlama();
      const ok = await initLlama();
      await clearLlamaConversationCache();
      console.log('[NexioAI] Chat switched model:', item.name, 'loaded:', ok);
      onActiveModelChange(item.name);
      onClose();
    } catch (err) {
      console.error('[NexioAI] Switch model error:', err);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleSelect = async (item: ModelCatalogItem) => {
    if (item.isActive || switchingId) {
      return;
    }

    if (item.downloaded) {
      await activateModel(item);
      return;
    }

    if (item.fit === 'unsupported') {
      return;
    }

    console.log('[NexioAI] Chat picker download:', item.id);
    startDownload(item.id, { setActive: true })
      .then(async () => {
        await releaseLlama();
        await initLlama();
        await clearLlamaConversationCache();
        await loadCatalog();
        onActiveModelChange(item.name);
        onClose();
      })
      .catch(err => {
        console.error('[NexioAI] Chat picker download failed:', err);
        loadCatalog();
      });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Offline model</Text>
          <Text style={styles.subtitle}>
            Pick a model for chat. If it is not on your phone yet, it will download
            here.
          </Text>

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={styles.loader}
            />
          ) : (
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {items.map(item => {
                const job = getDownload(item.id);
                const downloading = job?.status === 'downloading';
                const canUse = item.fit !== 'unsupported';
                const busy = switchingId === item.id || downloading;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      item.isActive && styles.rowActive,
                    ]}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {item.sizeMb} MB · {item.fitLabel}
                      </Text>
                      {downloading && (
                        <ModelProgressBar
                          percent={job?.percent ?? 0}
                          label="Downloading"
                        />
                      )}
                      {job?.status === 'failed' && job.error && (
                        <Text style={styles.rowError}>{job.error}</Text>
                      )}
                    </View>
                    <View style={styles.rowAction}>
                      {item.isActive ? (
                        <Text style={styles.activeLabel}>Active</Text>
                      ) : item.downloaded ? (
                        <PrimaryButton
                          title={busy ? '…' : 'Use'}
                          onPress={() => handleSelect(item)}
                          disabled={busy}
                          style={styles.actionBtn}
                        />
                      ) : (
                        <PrimaryButton
                          title={
                            canUse
                              ? downloading
                                ? `${job?.percent ?? 0}%`
                                : 'Download'
                              : 'N/A'
                          }
                          onPress={() => handleSelect(item)}
                          disabled={!canUse || busy}
                          loading={downloading}
                          variant={canUse ? 'primary' : 'secondary'}
                          style={styles.actionBtn}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 10, 16, 0.72)',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 50,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 32,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: {
    borderColor: colors.primary,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  rowError: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 6,
  },
  rowAction: {
    minWidth: 88,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  activeLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
