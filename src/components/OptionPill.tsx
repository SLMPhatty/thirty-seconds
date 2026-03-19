import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function OptionPill({ label, active, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.pip, active && styles.pipActive]} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    backgroundColor: 'rgba(232, 228, 223, 0.02)',
  },
  pillActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSurface,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(232, 228, 223, 0.15)',
  },
  pipActive: {
    backgroundColor: colors.accent,
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
