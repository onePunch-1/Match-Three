import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import Timer from '../ProgressTimer';

interface CHeaderProps {
  score: number;
  moveCount: number;
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  containerStyle?: object;
}
const CHeader = ({
  score,
  moveCount,
  setMoveCount,
  containerStyle,
}: CHeaderProps) => {
  return (
    <View style={[styles.header, containerStyle]}>
      <Timer setMoveCount={setMoveCount} moveCount={moveCount} score={score} />
      <View style={styles.scoreElement}>
        <Text>{score}</Text>
      </View>
      <View style={styles.scoreElement}>
        <Text>{moveCount}</Text>
      </View>
    </View>
  );
};

export default CHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '94%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    marginTop: 10,
  },
  scoreElement: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
});
