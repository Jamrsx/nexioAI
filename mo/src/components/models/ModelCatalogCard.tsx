import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ModelCatalogItem, ModelFitLevel } from '../../types/models';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';

type Props = {
  item: ModelCatalogItem;
  downloading: boolean;
  downloadPercent: number | null;
  onDownload: () => void;
  onSetActive: () => void;
  onDelete: () => void;
};

const fitColor: Record<ModelFitLevel, string> = {
  recommended: colors.success,
  compatible: colors.accent,
  heavy: '#f59e0b',
  unsupported: colors.danger,
};

export function ModelCatalogCard({
  item,
  downloading,
  downloadPercent,
  onDownload,
  onSetActive,
  onDelete,
}: Props) {
  const canDownload = item.fit !== 'unsupported';

  return (
    <View style={[styles.card, item.isActive && styles.cardActive]}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{item.name}</Text>
        {item.isActive && <Text style={styles.activeBadge}>ACTIVE</Text>}
      </View>

      <Text style={styles.desc}>{item.description}</Text>
      <Text style={styles.meta}>
        ~{item.sizeMb} MB · min {item.minRamMb} MB RAM
      </Text>

      <Text style={[styles.fit, { color: fitColor[item.fit] }]}>
        {item.fitLabel}
      </Text>

      {downloading && downloadPercent != null && (
        <Text style={styles.progress}>Downloading… {downloadPercent}%</Text>
      )}

      <View style={styles.actions}>
        {!item.downloaded && (
          <PrimaryButton
            title={canDownload ? 'Download' : 'Not enough RAM/storage'}
            onPress={onDownload}
            loading={downloading}
            disabled={!canDownload || downloading}
            style={styles.btn}
          />
        )}

        {item.downloaded && !item.isActive && (
          <PrimaryButton
            title="Use this model"
            onPress={onSetActive}
            style={styles.btn}
          />
        )}

        {item.downloaded && (
          <PrimaryButton
            title="Delete"
            variant="danger"
            onPress={onDelete}
            style={styles.btn}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardActive: {
    borderColor: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  activeBadge: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  fit: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  progress: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 6,
  },
  actions: {
    marginTop: 10,
    gap: 8,
  },
  btn: {
    width: '100%',
  },
});
