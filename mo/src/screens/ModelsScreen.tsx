import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ModelCatalogCard } from '../components/models/ModelCatalogCard';
import { ModelsSectionHeader } from '../components/models/ModelsSectionHeader';
import { ModelProgressBar } from '../components/models/ModelProgressBar';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useModelDownloads } from '../context/ModelDownloadContext';
import { ensureDatabaseReady } from '../db/database';
import { getDeviceSpecSummary } from '../services/deviceSpecs';
import {
  buildModelCatalogItems,
  formatDeviceSummary,
  getTopRecommendation,
} from '../services/modelRecommendation';
import { deleteModel, setActiveModel } from '../services/modelStorage';
import { releaseLlama, initLlama } from '../services/llamaService';
import type { ModelCatalogItem, DeviceSpecSummary } from '../types/models';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<MainStackParamList, 'Models'>;

function ModelCardList({
  items,
  getDownload,
  onDownload,
  onSetActive,
  onDelete,
}: {
  items: ModelCatalogItem[];
  getDownload: ReturnType<typeof useModelDownloads>['getDownload'];
  onDownload: (id: string) => void;
  onSetActive: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <>
      {items.map(item => {
        const job = getDownload(item.id);
        const downloading = job?.status === 'downloading';
        const downloadError =
          job?.status === 'failed' ? job.error : null;

        return (
          <ModelCatalogCard
            key={item.id}
            item={item}
            downloading={downloading}
            downloadPercent={downloading ? job?.percent ?? 0 : null}
            downloadError={downloadError}
            onDownload={() => onDownload(item.id)}
            onSetActive={() => onSetActive(item.id)}
            onDelete={() => onDelete(item.id, item.name)}
          />
        );
      })}
    </>
  );
}

export function ModelsScreen(_props: Props) {
  const isFocused = useIsFocused();
  const { getDownload, startDownload, downloads } = useModelDownloads();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [specs, setSpecs] = useState<DeviceSpecSummary | null>(null);
  const [items, setItems] = useState<ModelCatalogItem[]>([]);

  const loadCatalog = useCallback(async () => {
    await ensureDatabaseReady();
    const deviceSpecs = await getDeviceSpecSummary();
    const catalog = await buildModelCatalogItems(deviceSpecs);
    setSpecs(deviceSpecs);
    setItems(catalog);
    console.log('[NexioAI] Model catalog loaded:', catalog.length);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCatalog();
    } finally {
      setRefreshing(false);
    }
  }, [loadCatalog]);

  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadCatalog();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadCatalog]);

  useFocusEffect(
    useCallback(() => {
      loadCatalog();
    }, [loadCatalog]),
  );

  React.useEffect(() => {
    if (downloads.length === 0) {
      return;
    }
    loadCatalog();
  }, [downloads, loadCatalog]);

  const { installed, catalog, activeModel, topPick } = useMemo(() => {
    const onDevice = items.filter(i => i.downloaded);
    const notOnDevice = items.filter(i => !i.downloaded);
    const active = onDevice.find(i => i.isActive) ?? null;
    const pick = getTopRecommendation(items);
    return {
      installed: onDevice,
      catalog: notOnDevice,
      activeModel: active,
      topPick: pick,
    };
  }, [items]);

  const handleDownload = (modelId: string) => {
    console.log('[NexioAI] Starting background download:', modelId);
    startDownload(modelId, { setActive: true })
      .then(async () => {
        await releaseLlama();
        await initLlama();
        await loadCatalog();
        if (isFocused) {
          Alert.alert('Download complete', 'Model is ready for offline chat.');
        }
      })
      .catch(err => {
        if (isFocused) {
          const message = err instanceof Error ? err.message : 'Download failed';
          Alert.alert('Download failed', message);
        }
      });
  };

  const handleSetActive = async (modelId: string) => {
    try {
      await setActiveModel(modelId);
      await releaseLlama();
      await initLlama();
      await loadCatalog();
      Alert.alert('Active model updated', 'New chats will use this model.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = (modelId: string, name: string) => {
    Alert.alert('Remove model', `Delete ${name} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteModel(modelId);
          await releaseLlama();
          await loadCatalog();
        },
      },
    ]);
  };

  const overallDownloadPercent =
    downloads.length > 0
      ? Math.round(
          downloads.reduce((sum, d) => sum + d.percent, 0) / downloads.length,
        )
      : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }>
      <Text style={styles.lead}>
        Manage GGUF models for on-device chat. One model is active at a time.
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{installed.length}</Text>
          <Text style={styles.statLabel}>Installed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statBox, styles.statBoxFlex]}>
          <Text style={styles.statValueSmall} numberOfLines={1}>
            {activeModel?.name ?? 'None'}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{catalog.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      {specs && (
        <View style={styles.deviceCard}>
          <Text style={styles.deviceTitle}>Device profile</Text>
          <Text style={styles.deviceValue}>{formatDeviceSummary(specs)}</Text>
          {topPick && !topPick.downloaded && catalog.length > 0 && (
            <View style={styles.suggestRow}>
              <Text style={styles.suggestLabel}>Suggested</Text>
              <Text style={styles.suggestValue}>
                {topPick.name} · {topPick.fitLabel}
              </Text>
            </View>
          )}
        </View>
      )}

      {downloads.length > 0 && (
        <View style={styles.downloadPanel}>
          <View style={styles.downloadPanelHeader}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.downloadPanelTitle}>
              {downloads.length === 1
                ? 'Downloading 1 model'
                : `Downloading ${downloads.length} models`}
            </Text>
          </View>
          <ModelProgressBar
            percent={overallDownloadPercent}
            label="Overall progress"
          />
          <Text style={styles.downloadPanelHint}>
            You can leave this screen — download continues in the background.
          </Text>
        </View>
      )}

      {loading && items.length === 0 && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading catalog…</Text>
        </View>
      )}

      {!loading && installed.length > 0 && (
        <>
          <ModelsSectionHeader title="On this device" count={installed.length} />
          <ModelCardList
            items={installed}
            getDownload={getDownload}
            onDownload={handleDownload}
            onSetActive={handleSetActive}
            onDelete={handleDelete}
          />
        </>
      )}

      {!loading && catalog.length > 0 && (
        <>
          <ModelsSectionHeader
            title={installed.length > 0 ? 'Download more' : 'Catalog'}
            count={catalog.length}
          />
          <ModelCardList
            items={catalog}
            getDownload={getDownload}
            onDownload={handleDownload}
            onSetActive={handleSetActive}
            onDelete={handleDelete}
          />
        </>
      )}

      {!loading && items.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No models in catalog</Text>
          <Text style={styles.emptyText}>Pull down to refresh.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  lead: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  statBoxFlex: {
    flex: 1.4,
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statValueSmall: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  deviceCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  deviceValue: {
    color: colors.text,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  suggestRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestLabel: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestValue: {
    color: colors.text,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  downloadPanel: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.35)',
  },
  downloadPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downloadPanelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  downloadPanelHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
});
