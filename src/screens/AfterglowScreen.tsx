import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  duration: number;
  onComplete: () => void;
}

const FADE_IN = 800;
const HOLD = 4000;
const FADE_OUT = 800;

export function AfterglowScreen({ duration, onComplete }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_IN,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Fade out after hold
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, FADE_IN + HOLD);

    const navTimer = setTimeout(onComplete, FADE_IN + HOLD + FADE_OUT + 50);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(navTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Text style={styles.heading}>you are powerful.</Text>
        <Text style={styles.subtext}>go be great.</Text>
      </Animated.View>
    </View>
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
  heading: {
    fontFamily: fonts.serif,
    fontSize: 44,
    color: colors.warm,
    marginBottom: 16,
  },
  subtext: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 24,
  },
});
