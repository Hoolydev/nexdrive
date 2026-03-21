/**
 * Dispara vibração háptica em dispositivos móveis compatíveis.
 * Fallback silencioso em desktop.
 */
export function hapticFeedback(
  pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'medium'
) {
  if (!navigator.vibrate) return;
  const patterns: Record<typeof pattern, number[]> = {
    light: [10],
    medium: [30],
    heavy: [60],
    success: [20, 50, 20],
    error: [100, 30, 100],
  };
  navigator.vibrate(patterns[pattern]);
}
