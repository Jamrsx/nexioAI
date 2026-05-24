/**
 * NexioAI dark theme — swap logo later; colors stay centralized here.
 */
export const colors = {
  background: '#0f0f14',
  surface: '#1a1a24',
  surfaceElevated: '#242433',
  border: '#2e2e3d',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  primary: '#8b5cf6',
  primaryDark: '#6d28d9',
  accent: '#a78bfa',
  success: '#22c55e',
  danger: '#ef4444',
  placeholder: '#3f3f50',
} as const;

export type AppColors = typeof colors;
