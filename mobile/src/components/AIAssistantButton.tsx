
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

type Props = {
  onPress: () => void;
};

export default function AIAssistantButton({ onPress }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.icon}>✦</Text>
        <Text style={styles.label}>AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 18,
    bottom: 90,
    zIndex: 999,
  },
  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#035641',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#058764',
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: 'bold',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
