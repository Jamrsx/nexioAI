import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ModelCatalogCard } from '../components/models/ModelCatalogCard';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { getDeviceSpecSummary } from '../services/deviceSpecs';
import {
  buildModelCatalogItems,
  formatDeviceSummary,
  getTopRecommendation,
} from '../services/modelRecommendation';
import {
  deleteModel,
  downloadModel,
  setActiveModel,
} from '../services/modelStorage';
import { releaseLlama, initLlama } from '../services/llamaService';
import type { ModelCatalogItem, DeviceSpecSummary } from '../types/models';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<MainStackParamList, 'Models'>;

export function ModelsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [specs, setSpecs] = useState<DeviceSpecSummary | null>(null);
  const [items, setItems] = useState<ModelCatalogItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);

  const loadCatalog = useCallback(async () => {
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

  const handleDownload = async (modelId: string) => {
    setDownloadingId(modelId);
    setDownloadPercent(0);
    try {
      await downloadModel(
        modelId,
        progress => setDownloadPercent(progress.percent),
        { setActive: true },
      );
      await releaseLlama();
      await initLlama();
      await loadCatalog();
      Alert.alert('Download complete', 'Model is ready for offline chat.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      Alert.alert('Download failed', message);
    } finally {
      setDownloadingId(null);
      setDownloadPercent(null);
    }
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
    Alert.alert('Delete model', `Remove ${name} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteModel(modelId);
          await releaseLlama();
          await loadCatalog();
        },
      },
    ]);
  };

  const topPick = getTopRecommendation(items);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }>
      <Text style={styles.title}>Offline models</Text>
      <Text style={styles.subtitle}>
        Download one or more GGUF models. Only the active model is used for chat.
        All chats stay on your phone and can sync when online.
      </Text>

      {loading && (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      )}

      {specs && (
        <View style={styles.specCard}>
          <Text style={styles.specLabel}>Your device</Text>
          <Text style={styles.specValue}>{formatDeviceSummary(specs)}</Text>
          {topPick && !topPick.downloaded && (
            <Text style={[styles.recommendation, styles.mt]}>
              Suggested: {topPick.name} — {topPick.fitLabel}
            </Text>
          )}
        </View>
      )}

      {items.map(item => (
        <ModelCatalogCard
          key={item.id}
          item={item}
          downloading={downloadingId === item.id}
          downloadPercent={downloadingId === item.id ? downloadPercent : null}
          onDownload={() => handleDownload(item.id)}
          onSetActive={() => handleSetActive(item.id)}
          onDelete={() => handleDelete(item.id, item.name)}
        />
      ))}

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.footer}>← Back to settings</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  loader: { marginTop: 24 },
  specCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  specLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specValue: {
    color: colors.text,
    fontSize: 13,
    marginTop: 4,
  },
  recommendation: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  mt: { marginTop: 8 },
  footer: {
    color: colors.accent,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
});
