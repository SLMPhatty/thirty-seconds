export type BreathPattern = 'default' | 'box' | '4-7-8' | 'coherence';

export interface PhaseConfig {
  phase: 'in' | 'hold' | 'out';
  duration: number;
  label: string;
}

export interface BreathingPattern {
  label: string;
  phases: PhaseConfig[];
  cycleSeconds: number;
}

export const DEFAULT_BREATH_PATTERN: BreathPattern = 'default';

export const BREATHING_PATTERNS: Record<BreathPattern, BreathingPattern> = {
  default: {
    label: 'default',
    cycleSeconds: 8,
    phases: [
      { phase: 'in', duration: 4000, label: 'breathe in' },
      { phase: 'out', duration: 4000, label: 'breathe out' },
    ],
  },
  box: {
    label: 'box breathing',
    cycleSeconds: 16,
    phases: [
      { phase: 'in', duration: 4000, label: 'breathe in' },
      { phase: 'hold', duration: 4000, label: 'hold' },
      { phase: 'out', duration: 4000, label: 'breathe out' },
      { phase: 'hold', duration: 4000, label: 'hold' },
    ],
  },
  '4-7-8': {
    label: '4-7-8',
    cycleSeconds: 19,
    phases: [
      { phase: 'in', duration: 4000, label: 'breathe in' },
      { phase: 'hold', duration: 7000, label: 'hold' },
      { phase: 'out', duration: 8000, label: 'breathe out' },
    ],
  },
  coherence: {
    label: 'coherence',
    cycleSeconds: 11,
    phases: [
      { phase: 'in', duration: 5500, label: 'breathe in' },
      { phase: 'out', duration: 5500, label: 'breathe out' },
    ],
  },
};

export const PREMIUM_PATTERNS: BreathPattern[] = ['box', '4-7-8', 'coherence'];
