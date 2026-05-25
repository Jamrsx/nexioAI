/**
 * NexioAI brand palette (from logo)
 * Logo blue ~#007bff → primary uses a slightly darker accent for UI
 */
export const colors = {
  /** Logo circle background */
  background: '#050a10',
  surface: '#0a121c',
  surfaceElevated: '#0f1a28',
  border: '#1a2a3d',
  text: '#ffffff',
  textMuted: '#94a3b8',
  /** Slightly darker than logo bright blue (#007bff) */
  primary: '#0066cc',
  primaryDark: '#004d99',
  /** Logo brace blue (highlights, links) */
  accent: '#007bff',
  success: '#22c55e',
  danger: '#ef4444',
  placeholder: '#1a2a3d',
} as const;

export type AppColors = typeof colors;
