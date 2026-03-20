import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme';
import { usePurchase } from '../hooks/usePurchase';

interface Props {
  onBack: () => void;
  onUnlocked: () => void;
}

export function UnlockScreen({ onBack, onUnlocked }: Props) {
  const { purchase, restore, purchasing } = usePurchase();

  const handlePurchase = async () => {
    const success = await purchase();
    if (success) onUnlocked();
  };

  const handleRestore = async () => {
    const success = await restore();
    if (success) onUnlocked();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>you showed up today</Text>
      <Text style={styles.subtitle}>
        unlock unlimited sessions for every moment you need a breath
      </Text>

      {purchasing ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginBottom: 12 }} />
      ) : (
        <TouchableOpacity style={styles.unlockBtn} onPress={handlePurchase} activeOpacity={0.8}>
          <Text style={styles.unlockText}>unlock thirty</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.price}>$4.99 — one time, forever</Text>

      <TouchableOpacity onPress={handleRestore} activeOpacity={0.7}>
        <Text style={styles.restoreText}>restore purchase</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={styles.backText}>back</Text>
      </TouchableOpacity>
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
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 36,
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textDim,
    fontFamily: 'DMSans',
    marginBottom: 40,
    maxWidth: 320,
    lineHeight: 24,
    textAlign: 'center',
  },
  unlockBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 40,
    backgroundColor: colors.accent,
    marginBottom: 12,
  },
  unlockText: {
    fontSize: 15,
    color: colors.bg1,
    fontFamily: 'DMSans_500Medium',
  },
  price: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    marginBottom: 32,
  },
  restoreText: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 13,
    color: colors.textFaint,
    fontFamily: 'DMSans',
    textDecorationLine: 'underline',
  },
});
