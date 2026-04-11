import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  selected: number;
  unlocked: boolean;
  onSelect: (dur: number) => void;
}

const durations = [30, 60];

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
            {dur === 30 ? (
              <Text style={[styles.label, isActive && styles.labelActive]}>
                30s
              </Text>
            ) : (
              <View style={styles.labelWrap}>
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  1m{isLocked ? ' \u{1F512}' : ''}
                </Text>
                <Text style={[styles.sublabel, isActive && styles.sublabelActive]}>
                  overachiever
                </Text>
              </View>
            )}
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
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(232, 228, 223, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  labelActive: {
    color: colors.text,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sublabel: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textDim,
    fontFamily: 'DMSans',
    textAlign: 'center',
  },
  sublabelActive: {
    color: colors.textFaint,
  },
});
