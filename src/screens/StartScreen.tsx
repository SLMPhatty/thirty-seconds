import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme';
import { OptionPill } from '../components/OptionPill';
import { DurationPicker } from '../components/DurationPicker';
import {
  getStreak,
  getPrefs,
  setPrefs,
  isUnlocked as checkUnlocked,
  canPlay,
  getFreeSessions,
  hasPracticedToday,
  Prefs,
  AmbientSound,
} from '../utils/storage';
import { DEFAULT_BREATH_PATTERN } from '../data/breathingPatterns';

interface Props {
  onBegin: (prefs: Prefs) => void;
  onUnlock: () => void;
  onHistory: () => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'good morning';
  if (h >= 12 && h < 17) return 'good afternoon';
  if (h >= 17 && h < 21) return 'good evening';
  return 'good night';
}

export function StartScreen({ onBegin, onUnlock, onHistory }: Props) {
  const [prefs, setLocalPrefs] = useState<Prefs>({
    ambientSound: 'rain',
    hideTimer: false,
    haptics: true,
    healthKit: true,
    duration: 30,
    breathPattern: DEFAULT_BREATH_PATTERN,
    reminderTime: 'off',
    onboardingSeen: true,
  });
  const [streak, setStreak] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [playable, setPlayable] = useState(true);
  const [freeLeft, setFreeLeft] = useState(3);
  const [practicedToday, setPracticedToday] = useState(true);

  const loadState = useCallback(async () => {
    const [p, s, u, cp, fl, pt] = await Promise.all([
      getPrefs(),
      getStreak(),
      checkUnlocked(),
      canPlay(),
      getFreeSessions(),
      hasPracticedToday(),
    ]);
    setLocalPrefs(p);
    setStreak(s);
    setUnlocked(u);
    setPlayable(cp);
    setFreeLeft(fl);
    setPracticedToday(pt);
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const togglePref = async (key: keyof Prefs) => {
    if ((key === 'haptics' || key === 'hideTimer') && !prefs[key] && !unlocked) {
      onUnlock();
      return;
    }
    const updated = { ...prefs, [key]: !prefs[key] };
    setLocalPrefs(updated);
    await setPrefs(updated);
  };

  const selectDuration = async (dur: number) => {
    if (dur > 30 && !unlocked) {
      onUnlock();
      return;
    }
    const updated = {
      ...prefs,
      duration: dur,
      breathPattern: dur < 60 ? DEFAULT_BREATH_PATTERN : prefs.breathPattern,
    };
    setLocalPrefs(updated);
    await setPrefs(updated);
  };

  const selectSound = async (sound: AmbientSound) => {
    if ((sound === 'brown' || sound === 'bowl') && !unlocked) {
      onUnlock();
      return;
    }
    const updated = { ...prefs, ambientSound: sound };
    setLocalPrefs(updated);
    await setPrefs(updated);
  };

  const handleBegin = () => {
    if (!playable) {
      onUnlock();
      return;
    }
    onBegin(prefs);
  };

  const isStreakAtRisk = streak > 0 && !practicedToday && new Date().getHours() >= 18;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{getGreeting()}</Text>
      <Text style={styles.brand}>thirty</Text>
      <Text style={styles.tagline}>30 seconds of stillness</Text>

      <TouchableOpacity
        style={[styles.startBtn, !playable && styles.startBtnDisabled]}
        onPress={handleBegin}
        activeOpacity={0.7}
      >
        <Text style={styles.startBtnText}>{playable ? 'begin' : 'unlock'}</Text>
      </TouchableOpacity>

      <View style={styles.options}>
        <View style={styles.soundPicker}>
          {(['off', 'rain', 'brown', 'bowl'] as AmbientSound[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.soundBtn, prefs.ambientSound === s && styles.soundBtnActive]}
              onPress={() => selectSound(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.soundLabel, prefs.ambientSound === s && styles.soundLabelActive]}>
                {!unlocked && (s === 'brown' || s === 'bowl') ? '🔒 ' : ''}{s === 'brown' ? 'white noise' : s === 'bowl' ? 'sound bowl' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <OptionPill
          label={!unlocked && !prefs.hideTimer ? '🔒 hide timer' : 'hide timer'}
          active={prefs.hideTimer}
          onPress={() => togglePref('hideTimer')}
        />
        <OptionPill
          label={!unlocked && !prefs.haptics ? '🔒 haptics' : 'haptics'}
          active={prefs.haptics}
          onPress={() => togglePref('haptics')}
        />
        <DurationPicker
          selected={prefs.duration}
          unlocked={unlocked}
          onSelect={selectDuration}
        />
      </View>

      <TouchableOpacity
        style={[styles.healthCard, prefs.healthKit && styles.healthCardActive]}
        onPress={() => togglePref('healthKit')}
        activeOpacity={0.8}
      >
        <View style={styles.healthCardHeader}>
          <View style={[styles.healthIconWrap, prefs.healthKit && styles.healthIconWrapActive]}>
            <Text style={styles.healthIcon}>♡</Text>
          </View>
          <View style={styles.healthCardCopy}>
            <Text style={styles.healthTitle}>Apple Health Integration</Text>
            <Text style={styles.healthDescription}>
              Log each meditation session to Apple Health as Mindful Minutes.
            </Text>
          </View>
        </View>
        <View style={styles.healthCardFooter}>
          <Text style={[styles.healthStatus, prefs.healthKit && styles.healthStatusActive]}>
            {prefs.healthKit ? 'On: saving mindful minutes' : 'Off: not saving to Apple Health'}
          </Text>
          <View style={[styles.healthToggle, prefs.healthKit && styles.healthToggleActive]}>
            <View style={[styles.healthToggleKnob, prefs.healthKit && styles.healthToggleKnobActive]} />
          </View>
        </View>
      </TouchableOpacity>

      {streak > 0 && (
        <TouchableOpacity style={styles.streakRow} onPress={onHistory} activeOpacity={0.7}>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}> day streak ›</Text>
          {isStreakAtRisk && (
            <Text style={styles.streakAtRisk}>  at risk</Text>
          )}
        </TouchableOpacity>
      )}

      {!unlocked && (
        <Text style={styles.limitNote}>
          {playable
            ? `${freeLeft} free session${freeLeft !== 1 ? 's' : ''} remaining`
            : 'your free sessions are up'
          }
          {'\n'}
          <Text style={styles.limitLink} onPress={onUnlock}>
            unlock unlimited — $4.99 once →
          </Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    marginBottom: 6,
    textTransform: 'lowercase',
  },
  brand: {
    fontFamily: 'InstrumentSerif',
    fontSize: 56,
    color: colors.text,
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textDim,
    fontFamily: 'DMSans',
    marginBottom: 56,
  },
  startBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnDisabled: {
    opacity: 0.5,
    borderColor: colors.warm,
  },
  startBtnText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: colors.text,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 36,
    marginBottom: 18,
    maxWidth: 340,
  },
  soundPicker: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    overflow: 'hidden',
  },
  soundBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(232, 228, 223, 0.02)',
  },
  soundBtnActive: {
    backgroundColor: 'rgba(165, 148, 249, 0.1)',
  },
  soundLabel: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
  },
  soundLabelActive: {
    color: colors.text,
  },
  healthCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
  },
  healthCardActive: {
    borderColor: colors.accentBorder,
    backgroundColor: 'rgba(240, 200, 150, 0.06)',
  },
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  healthIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: 'rgba(232, 228, 223, 0.03)',
  },
  healthIconWrapActive: {
    borderColor: colors.accentBorder,
    backgroundColor: 'rgba(240, 200, 150, 0.12)',
  },
  healthIcon: {
    fontSize: 23,
    color: colors.warm,
    fontFamily: 'DMSans_500Medium',
  },
  healthCardCopy: {
    flex: 1,
    gap: 4,
  },
  healthTitle: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'DMSans_500Medium',
  },
  healthDescription: {
    fontSize: 14,
    color: colors.textDim,
    fontFamily: 'DMSans',
    lineHeight: 20,
  },
  healthCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthStatus: {
    flex: 1,
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
  },
  healthStatusActive: {
    color: colors.text,
  },
  healthToggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: 'rgba(232, 228, 223, 0.08)',
    justifyContent: 'center',
  },
  healthToggleActive: {
    borderColor: colors.accentBorder,
    backgroundColor: 'rgba(165, 148, 249, 0.25)',
  },
  healthToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textFaint,
  },
  healthToggleKnobActive: {
    marginLeft: 22,
    backgroundColor: colors.text,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 48,
  },
  streakNum: {
    fontSize: 14,
    color: colors.textDim,
    fontFamily: 'DMSans_500Medium',
  },
  streakLabel: {
    fontSize: 14,
    color: colors.textFaint,
    fontFamily: 'DMSans',
  },
  streakAtRisk: {
    fontSize: 12,
    color: colors.warm,
    fontFamily: 'DMSans',
    opacity: 0.8,
  },
  limitNote: {
    marginTop: 16,
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    textAlign: 'center',
  },
  limitLink: {
    color: colors.warm,
  },
});
