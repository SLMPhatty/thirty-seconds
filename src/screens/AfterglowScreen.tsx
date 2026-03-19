import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme';

interface Props {
  onComplete: () => void;
}

const FADE_IN = 800;
const HOLD = 4000;
const FADE_OUT = 800;

export function AfterglowScreen({ onComplete }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: FADE_IN, easing: Easing.out(Easing.ease) });

    const fadeOutTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_OUT, easing: Easing.in(Easing.ease) });
    }, FADE_IN + HOLD);

    const navTimer = setTimeout(onComplete, FADE_IN + HOLD + FADE_OUT + 50);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(navTimer);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, animStyle]}>
        <Animated.Text style={styles.heading}>well done.</Animated.Text>
        <Animated.Text style={styles.subtext}>
          a brief moment of stillness{'\n'}allows us to re-center.
        </Animated.Text>
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
