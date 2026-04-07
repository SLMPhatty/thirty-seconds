import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  duration: number;
  healthKitEnabled: boolean;
  healthKitSaved: boolean;
  onComplete: () => void;
}

const FADE_IN = 800;
const HOLD = 4000;
const FADE_OUT = 800;

export function AfterglowScreen({ duration, healthKitEnabled, healthKitSaved, onComplete }: Props) {
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
        <Text style={styles.heading}>well done.</Text>
        <Text style={styles.subtext}>
          a brief moment of stillness{'\n'}allows us to re-center.
        </Text>
        {healthKitEnabled && healthKitSaved && (
          <View style={styles.healthBanner}>
            <Text style={styles.healthIcon}>♡</Text>
            <View style={styles.healthCopy}>
              <Text style={styles.healthTitle}>Saved to Apple Health</Text>
              <Text style={styles.healthText}>
                {duration} mindful minute{duration === 1 ? '' : 's'} logged
              </Text>
            </View>
          </View>
        )}
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
  healthBanner: {
    marginTop: 28,
    width: '100%',
    maxWidth: 320,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: 'rgba(240, 200, 150, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  healthIcon: {
    fontFamily: fonts.sansMedium,
    fontSize: 24,
    color: colors.warm,
  },
  healthCopy: {
    flex: 1,
    gap: 2,
  },
  healthTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.text,
  },
  healthText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textDim,
  },
});
