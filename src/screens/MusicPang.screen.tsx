import React, { useState } from 'react';
import { StyleSheet, ImageBackground, Dimensions } from 'react-native';
import SwappableGrid from '../components/SwappableGrid';
import CHeader from '../components/common/CHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudsBackground } from '../assets/images';

const GameScreen = () => {
  const [moveCount, setMoveCount] = useState(0);
  const [score, setScore] = useState(0);
  return (
    <ImageBackground source={CloudsBackground} style={styles.backGroundImage}>
      <SafeAreaView style={styles.scoreBoard}>
        <CHeader
          score={score}
          moveCount={moveCount}
          setMoveCount={setMoveCount}
          containerStyle={styles.headerContainer}
        />
        <SwappableGrid setMoveCount={setMoveCount} setScore={setScore} />
      </SafeAreaView>
    </ImageBackground>
  );
};

let Window = Dimensions.get('window');

let windowWidth = Window.width;
let windowHeight = Window.height;

let styles = StyleSheet.create({
  backGroundImage: {
    flex: 1,
    width: windowWidth,
    height: windowHeight,
    flexDirection: 'column',
  },
  scoreBoard: {
    flexDirection: 'row',
    width: windowWidth,
    height: windowHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  headerContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
  },
});

export default GameScreen;
