import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme';
import type { ChallengeMember, CompletionEntry } from '../services/cloudkit';

interface Props {
  members: ChallengeMember[];
  completions: CompletionEntry[];
  centerLabel?: string;
  size?: number;
}

const DOT_SIZE = 40;
const SELF_DOT_SIZE = 48;

interface DotProps {
  member: ChallengeMember;
  completed: boolean;
  angle: number;
  radius: number;
  ringSize: number;
}

function Dot({ member, completed, angle, radius, ringSize }: DotProps) {
  const isSelf = member.isSelf;
  const size = isSelf ? SELF_DOT_SIZE : DOT_SIZE;
  const x = ringSize / 2 + radius * Math.cos(angle) - size / 2;
  const y = ringSize / 2 + radius * Math.sin(angle) - size / 2;

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const idlePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    if (!completed) return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [completed, scale]);

  useEffect(() => {
    if (!isSelf || !completed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, {
          toValue: 1.03,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idlePulse, {
          toValue: 0.97,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [idlePulse, isSelf, completed]);

  const filled = completed;
  const tint = isSelf ? colors.warm : colors.accent;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: x,
          top: y,
          opacity,
          transform: [{ scale: Animated.multiply(scale, idlePulse) }],
          borderColor: filled ? tint : isSelf ? colors.warm : colors.borderFaint,
          backgroundColor: filled ? tint : 'transparent',
          shadowColor: filled ? tint : 'transparent',
          shadowOpacity: filled ? 0.6 : 0,
          shadowRadius: filled ? 12 : 0,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
    </Animated.View>
  );
}

export function Constellation({ members, completions, centerLabel, size = 260 }: Props) {
  const completedIds = useMemo(
    () => new Set(completions.map((c) => c.memberId)),
    [completions]
  );

  const allComplete = members.length > 0 && members.every((m) => completedIds.has(m.id));
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!allComplete) return;
    Animated.sequence([
      Animated.timing(burst, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(burst, {
        toValue: 0,
        duration: 800,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [allComplete, burst]);

  const sorted = useMemo(() => {
    const self = members.find((m) => m.isSelf);
    const others = members.filter((m) => !m.isSelf);
    return self ? [self, ...others] : members;
  }, [members]);

  const count = Math.max(sorted.length, 1);
  const radius = Math.min(size, 320) / 2 - 32;

  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
            transform: [
              {
                scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }),
              },
            ],
          },
        ]}
      />
      {centerLabel && (
        <View style={[styles.centerLabelWrap, { width: size, height: size }]}>
          <Text style={styles.centerLabel} numberOfLines={2}>
            {centerLabel}
          </Text>
        </View>
      )}
      {sorted.map((member, i) => {
        // 12 o'clock = -PI/2; self always at 12 o'clock when present
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
        return (
          <Dot
            key={member.id}
            member={member}
            completed={completedIds.has(member.id)}
            angle={angle}
            radius={radius}
            ringSize={size}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.glow,
  },
  centerLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centerLabel: {
    fontFamily: 'InstrumentSerif',
    fontSize: 22,
    color: colors.textDim,
    textAlign: 'center',
  },
  dot: {
    position: 'absolute',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
