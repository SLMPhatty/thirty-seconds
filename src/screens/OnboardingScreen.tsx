import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../theme';

interface Props {
  onComplete: () => void;
}

const slides = [
  {
    title: "the world's\nshortest meditation",
    subtitle: '',
  },
  {
    title: 'one breath.\nthirty seconds.\nthat\'s all.',
    subtitle: 'tap to begin your practice',
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);

  const handleTap = () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[index];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTap}
      activeOpacity={1}
    >
      <Animated.View
        key={index}
        entering={FadeIn.duration(600)}
        style={styles.content}
      >
        <Text style={styles.title}>{slide.title}</Text>
        {slide.subtitle ? (
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        ) : null}
      </Animated.View>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 40,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: 'DMSans',
    fontSize: 16,
    color: colors.textDim,
    marginTop: 24,
    textAlign: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(232, 228, 223, 0.15)',
  },
  dotActive: {
    backgroundColor: colors.text,
  },
});
