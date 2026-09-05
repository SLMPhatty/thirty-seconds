import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme';
import { generateChallengeName } from '../utils/challengeNames';

interface Props {
  initialName?: string;
  onContinue: (name: string) => void;
  onCancel?: () => void;
}

function validateGroupName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'circle name must be at least 2 characters';
  if (trimmed.length > 48) return 'circle name must be 48 characters or fewer';
  return null;
}

export function ChallengeNamePrompt({ initialName, onContinue, onCancel }: Props) {
  const [name, setName] = useState(initialName || generateChallengeName());
  const [error, setError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const handleContinue = () => {
    const trimmed = name.trim();
    const err = validateGroupName(trimmed);
    if (err) {
      setError(err);
      return;
    }
    onContinue(trimmed);
  };

  const randomize = () => {
    setName(generateChallengeName());
    if (error) setError(null);
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <View style={styles.card}>
          <Text style={styles.title}>name your{`\n`}circle</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError(null);
            }}
            autoFocus
            maxLength={48}
            placeholder="circle name"
            placeholderTextColor={colors.textFaint}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            selectionColor={colors.accent}
          />
          <Text style={styles.hint}>
            friends will see this{`\n`}on the invite
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.continueText}>create circle</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={randomize} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>try another name</Text>
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>not now</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(14, 13, 12, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fill: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'InstrumentSerif',
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 28,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: 'DMSans',
    fontSize: 16,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
  error: {
    fontFamily: 'DMSans',
    fontSize: 12,
    color: colors.warm,
    marginTop: 10,
  },
  continueBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    backgroundColor: colors.accentSurface,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  continueText: {
    fontFamily: 'InstrumentSerif',
    fontSize: 18,
    color: colors.text,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.textDim,
    textDecorationLine: 'underline',
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: 'DMSans',
    fontSize: 13,
    color: colors.textFaint,
    textDecorationLine: 'underline',
  },
});
