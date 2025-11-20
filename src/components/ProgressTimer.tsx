import React, { useRef, useEffect } from 'react';
import { Text, View, StyleSheet, Animated } from 'react-native';

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const TIME_OUT = 40; // seconds

interface Props {
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  moveCount: number;
  score: number;
}

const ProgressTimer: React.FC<Props> = ({ setMoveCount, score }) => {
  const animation = useRef(new Animated.Value(TIME_OUT)).current;
  const [secondsLeft, setSecondsLeft] = React.useState(TIME_OUT);

  // Countdown every second
  useInterval(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        // Time's up → add move penalty and reset
        setMoveCount(m => m + 1);
        return TIME_OUT;
      }
      return prev - 1;
    });
  }, 1000);

  // Reset when score changes (new match made)
  useEffect(() => {
    setSecondsLeft(TIME_OUT);
  }, [score]);

  // Animate the bar smoothly
  useEffect(() => {
    Animated.timing(animation, {
      toValue: secondsLeft,
      duration: 300, // smooth transition
      useNativeDriver: false,
    }).start();
  }, [secondsLeft]);

  // Convert remaining seconds → progress (100% → 0%)
  const width = animation.interpolate({
    inputRange: [0, TIME_OUT],
    outputRange: ['0%', '100%'], // full when time is up, empty when full time
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#8BED4F', width },
          ]}
        />
      </View>
      <Text style={styles.timerText}>{secondsLeft}</Text>
    </View>
  );
};

export default ProgressTimer;

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressBar: {
    height: 16,
    width: 100,
    backgroundColor: 'white',
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
});
