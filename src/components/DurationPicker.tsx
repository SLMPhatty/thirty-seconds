import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  selected: number;
  unlocked: boolean;
  onSelect: (dur: number) => void;
}

const durations = [30, 60, 120, 300, 600, 900];

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  return `${s / 60}m`;
}

export function DurationPicker({ selected, unlocked, onSelect }: Props) {
  return (
    <View style={styles.group}>
      {durations.map((dur, i) => {
        const isActive = selected === dur;
        const isLocked = dur > 30 && !unlocked;
        const isLast = i === durations.length - 1;

        return (
          <TouchableOpacity
            key={dur}
            style={[
              styles.btn,
              isActive && styles.btnActive,
              !isLast && styles.btnBorder,
            ]}
            onPress={() => onSelect(dur)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {formatDuration(dur)}{isLocked ? ' \u{1F512}' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    overflow: 'hidden',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(232, 228, 223, 0.02)',
  },
  btnBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(232, 228, 223, 0.06)',
  },
  btnActive: {
    backgroundColor: 'rgba(165, 148, 249, 0.1)',
  },
  label: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
  },
  labelActive: {
    color: colors.text,
  },
});
