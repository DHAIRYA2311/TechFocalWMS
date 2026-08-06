import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const letters = "TECHFOCAL".split('');

const AnimatedLetter = ({ letter, index, color = '#3b82f6' }: { letter: string; index: number; color?: string }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Stagger the start time of each letter
    rotation.value = withDelay(
      index * 100, // 100ms delay between each letter
      withRepeat(
        withSequence(
          // Rotate 360 degrees
          withTiming(360, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          // Pause for 2 seconds before repeating
          withTiming(360, { duration: 2000 })
        ),
        -1, // Infinite loop
        false // Don't reverse, let it snap back to 0 (visually identical to 360)
      )
    );
  }, [index, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 400 },
        { rotateY: `${rotation.value}deg` }
      ],
    };
  });

  return (
    <Animated.Text style={[styles.letter, { color }, animatedStyle]}>
      {letter}
    </Animated.Text>
  );
};

interface TechFocalLoaderProps {
  color?: string;
  size?: number;
}

export default function TechFocalLoader({ color = '#3b82f6', size = 32 }: TechFocalLoaderProps) {
  return (
    <View style={styles.container}>
      {letters.map((char, index) => (
        <AnimatedLetter 
          key={`${index}-${char}`} 
          letter={char} 
          index={index} 
          color={color} 
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    fontSize: 28, // Default size, can be overridden
    fontWeight: '900',
    letterSpacing: 2,
    marginHorizontal: 1,
  },
});
