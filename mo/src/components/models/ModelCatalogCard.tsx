import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ModelCatalogItem, ModelFitLevel } from '../../types/models';
import { PrimaryButton } from '../PrimaryButton';
import { ModelProgressBar } from './ModelProgressBar';
import { colors } from '../../theme/colors';

type Props = {
  item: ModelCatalogItem;
  downloading: boolean;
  downloadPercent: number | null;
  downloadError: string | null;
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

const tierLabel: Record<ModelCatalogItem['tier'], string> = {
  light: 'Light',
  balanced: 'Balanced',
  quality: 'Quality',
};

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'active' | 'downloaded' | 'fit';
}) {
  const toneStyles =
    tone === 'active'
      ? styles.pillActive
      : tone === 'downloaded'
        ? styles.pillDownloaded
        : styles.pillFit;

  return (
    <View style={[styles.pill, toneStyles]}>
      <Text
        style={[
          styles.pillText,
          tone === 'active' && styles.pillTextActive,
          tone === 'downloaded' && styles.pillTextDownloaded,
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function ModelCatalogCard({
  item,
  downloading,
  downloadPercent,
  downloadError,
  onDownload,
  onSetActive,
  onDelete,
}: Props) {
  const canDownload = item.fit !== 'unsupported';
  const statusLabel = item.isActive
    ? 'In use'
    : item.downloaded
      ? 'Ready'
      : downloading
        ? 'Downloading'
        : null;

  return (
    <View
      style={[
        styles.card,
        item.isActive && styles.cardActive,
        item.downloaded && !item.isActive && styles.cardInstalled,
      ]}>
      {item.isActive && <View style={styles.accentBar} />}

      <View style={styles.cardBody}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          {statusLabel && (
            <StatusPill
              label={statusLabel}
              tone={item.isActive ? 'active' : item.downloaded ? 'downloaded' : 'fit'}
            />
          )}
        </View>

        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.sizeMb} MB</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.minRamMb} MB RAM</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{tierLabel[item.tier]}</Text>
          </View>
        </View>

        <View style={styles.fitRow}>
          <View
            style={[styles.fitDot, { backgroundColor: fitColor[item.fit] }]}
          />
          <Text style={[styles.fit, { color: fitColor[item.fit] }]}>
            {item.fitLabel}
          </Text>
        </View>

        {downloading && (
          <ModelProgressBar
            percent={downloadPercent ?? 0}
            label="Download in progress"
          />
        )}

        {downloadError && !downloading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} numberOfLines={3}>
              {downloadError}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {!item.downloaded && (
            <PrimaryButton
              title={canDownload ? 'Download' : 'Insufficient device specs'}
              onPress={onDownload}
              loading={downloading}
              disabled={!canDownload || downloading}
              style={styles.primaryAction}
            />
          )}

          {item.downloaded && (
            <View style={styles.downloadedActions}>
              {item.isActive ? (
                <View style={styles.inUseRow}>
                  <View style={styles.inUseDot} />
                  <Text style={styles.inUseText}>Used for offline chat</Text>
                </View>
              ) : (
                <PrimaryButton
                  title="Set as active"
                  onPress={onSetActive}
                  style={styles.flexBtn}
                />
              )}
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && styles.deleteBtnPressed,
                ]}>
                <Text style={styles.deleteBtnText}>Remove</Text>
              </Pressable>
            </View>
          )}

          {downloading && (
            <View style={styles.backgroundHint}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.backgroundHintText}>
                Continues if you leave this screen
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardInstalled: {
    backgroundColor: colors.surfaceElevated,
  },
  cardActive: {
    borderColor: colors.primary,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  cardBody: {
    padding: 16,
    paddingLeft: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: 'rgba(0, 102, 204, 0.15)',
    borderColor: colors.primary,
  },
  pillDownloaded: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: colors.success,
  },
  pillFit: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pillTextActive: {
    color: colors.accent,
  },
  pillTextDownloaded: {
    color: colors.success,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  fitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  fitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fit: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  primaryAction: {
    width: '100%',
  },
  downloadedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
  inUseRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.35)',
  },
  inUseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  inUseText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 88,
    alignItems: 'center',
  },
  deleteBtnPressed: {
    opacity: 0.85,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  backgroundHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  backgroundHintText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
