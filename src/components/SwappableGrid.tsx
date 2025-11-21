import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  LayoutChangeEvent,
  Easing,
  PanResponderGestureState,
  View,
} from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';
import {
  getRandomInt,
  getAllMatches,
  markAsMatch,
  condenseColumns,
  flattenArrayToPairs,
  findMoves,
  sleep,
} from '../lib/GridApi';
import { BEAN_OBJS } from '../lib/Images';
import { TileData, TileDataType } from '../lib/TileData';
import Tile from './Tile';
import { ROW, COLUMN } from '../lib/spec';
import EmptyMovesModal from './modal/emptyMovesModal';
import EmptyMoves from '../assets/images/lottie/no_more_moves.json';
import { CLinearGradient } from './common/CLinearGradient';

// react-native-swipe-gestures swipeDirections type
export enum swipeDirections {
  SWIPE_UP = 'SWIPE_UP',
  SWIPE_DOWN = 'SWIPE_DOWN',
  SWIPE_LEFT = 'SWIPE_LEFT',
  SWIPE_RIGHT = 'SWIPE_RIGHT',
}

interface Props {
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
}
const SwappableGrid = ({ setMoveCount, setScore }: Props) => {
  const [tileDataSource, setTileDataSource] = useState(initializeDataSource());
  const [showNoMoves, setShowNoMoves] = useState(false);
  const [blockScreen, setBlockScreen] = useState('');
  const gridOrigin = useRef([0, 0]);
  let invalidSwap = false;

  const config = { velocityThreshold: 0.3, directionalOffsetThreshold: 50 };

  useEffect(() => {
    (async function () {
      await sleep(500);
      animateValuesToLocations();
      await sleep(500);
      const nextMatches = getAllMatches(tileDataSource);
      if (nextMatches.length > 0) {
        setScore(
          score => score + flattenArrayToPairs(nextMatches).length * 100,
        );
        processMatches(nextMatches);
      } else {
        if (!findMoves(tileDataSource)) {
          await sleep(1500);
          setShowNoMoves(true);
          await sleep(4000);
          setShowNoMoves(false);
          setBlockScreen('');
          setTileDataSource(initializeDataSource());
        }
      }
    })();
  }, [tileDataSource]);

  useEffect(() => {
    if (!!blockScreen.length) {
      setTileDataSource(initializeDataSource());
    }
  }, [blockScreen]);

  const animateValuesToLocations = () => {
    tileDataSource.forEach((row, i) => {
      row.forEach((elem, j) => {
        Animated.timing(elem.location, {
          toValue: { x: TILE_WIDTH * i, y: TILE_WIDTH * j },
          duration: 500,
          useNativeDriver: true,
          easing: Easing.bezier(0.85, 0, 0.15, 1),
        }).start(() => {
          if (!!blockScreen.length) {
            setBlockScreen('');
          }
        });
      });
    });
  };

  const onLayout = (event: LayoutChangeEvent) => {
    gridOrigin.current = [
      event.nativeEvent.layout.x,
      event.nativeEvent.layout.y,
    ];
  };

  const renderTiles = (tileData: TileDataType[][]) => {
    const tiles = tileData.map(row =>
      row.map(e => (
        <Tile
          location={e.location}
          scale={e.scale}
          key={e.key}
          img={e.imgObj?.image}
        />
      )),
    );

    return tiles;
  };

  const onSwipe = (
    gestureName: string,
    gestureState: PanResponderGestureState,
  ) => {
    const { SWIPE_UP, SWIPE_DOWN, SWIPE_LEFT, SWIPE_RIGHT } = swipeDirections;

    let initialGestureX = gestureState.x0;
    let initialGestureY = gestureState.y0;

    let i = Math.round(
      (initialGestureX - gridOrigin.current[0] - 0.5 * TILE_WIDTH) / TILE_WIDTH,
    );
    let j = Math.round(
      (initialGestureY - gridOrigin.current[1] - 0.5 * TILE_WIDTH) / TILE_WIDTH,
    );

    if (i > -1 && j > -1 && i < ROW && j < COLUMN) {
      switch (gestureName) {
        case SWIPE_UP:
          if (j > 0) swap(i, j, 0, -1);
          break;
        case SWIPE_DOWN:
          if (j < COLUMN - 1) swap(i, j, 0, 1);
          break;
        case SWIPE_LEFT:
          if (i > 0) swap(i, j, -1, 0);
          break;
        case SWIPE_RIGHT:
          if (i < ROW - 1) swap(i, j, 1, 0);
          break;
      }
    }
  };

  const swap = (i: number, j: number, dx: number, dy: number) => {
    const swapStarter = tileDataSource[i][j];
    const swapEnder = tileDataSource[i + dx][j + dy];
    tileDataSource[i][j] = swapEnder;
    tileDataSource[i + dx][j + dy] = swapStarter;

    const animateSwap = Animated.parallel([
      Animated.timing(swapStarter.location, {
        toValue: { x: TILE_WIDTH * (i + dx), y: TILE_WIDTH * (j + dy) },
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(swapEnder.location, {
        toValue: { x: TILE_WIDTH * i, y: TILE_WIDTH * j },
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    animateSwap.start(() => {
      let allMatches = getAllMatches(tileDataSource);

      if (allMatches.length !== 0) {
        setMoveCount(moveCount => (moveCount += 1));
        processMatches(allMatches);
        setScore(score => score + flattenArrayToPairs(allMatches).length * 100);
      } else {
        if (invalidSwap) {
          invalidSwap = false;
          if (!findMoves(tileDataSource)) {
            setBlockScreen('No more moves available. Resetting the board...');
          }
          return;
        }
        invalidSwap = true;
        swap(i, j, dx, dy);
      }
    });
  };
  console.log(flattenArrayToPairs(tileDataSource));

  const processMatches = (matches: number[][][]) => {
    setTileDataSource(state => {
      let newTileDataSource = state.slice();
      markAsMatch(matches, newTileDataSource);
      condenseColumns(newTileDataSource);
      recolorMatches(newTileDataSource);

      return newTileDataSource;
    });
  };

  const recolorMatches = (tileData: TileDataType[][]) => {
    tileData.forEach(row => {
      row.forEach(e => {
        if (e.markedAsMatch === true) {
          let randIndex = getRandomInt(7);
          let randomBeanObj = BEAN_OBJS[randIndex];
          e.markedAsMatch = false;
          e.imgObj = randomBeanObj;
        }
      });
    });
  };

  return (
    <>
      <GestureRecognizer
        onLayout={onLayout}
        config={config}
        style={styles.gestureContainer}
        onSwipe={(direction, state) => onSwipe(direction, state)}
      >
        {/* <View style={styles.gridContainer}> */}
        <CLinearGradient
          colors={['red', 'pink']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.outergridContainer}
        >
          <CLinearGradient
            colors={['pink', 'cyan']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 2 }}
            style={
              styles.gridContainer
              //   {
              //   justifyContent: 'center',
              //   alignItems: 'center',
              //   borderRadius: 20,
              //   width: TILE_WIDTH * ROW * 0.75,
              //   height: TILE_WIDTH * COLUMN * 0.75,
              // }
            }
          >
            {renderTiles(tileDataSource)}
          </CLinearGradient>
        </CLinearGradient>
        {/* </View> */}
      </GestureRecognizer>
      <EmptyMovesModal
        visible={showNoMoves}
        heading={`No More\nMoves!`}
        headingStyle={styles.modalHeading}
        modalStyle={styles.modalStyle}
        description="Resetting the board..."
        descriptionStyle={styles.modalDescription}
        lottieImage={EmptyMoves}
        lottieStyle={styles.lottieStyle}
      />
    </>
  );
};

const generateKeys = (row: number, column: number) => {
  return [...Array(row)].map((_, r) =>
    [...Array(column)].map((_, c) => r * column + c),
  );
};

const initializeDataSource = (): TileDataType[][] => {
  let keys = generateKeys(ROW, COLUMN);

  var tileData = keys.map(row => {
    let dataRows = row.map(key => {
      let int = getRandomInt(7);
      let randomBeanObj = BEAN_OBJS[int];
      let data = TileData(randomBeanObj, key);
      return data;
    });
    return dataRows;
  });

  let allMatches = getAllMatches(tileData);
  if (!allMatches.length && findMoves(tileData)) return tileData;

  return initializeDataSource();
};

export default React.memo(SwappableGrid);

let Window = Dimensions.get('window');
let windowSpan = Math.min(Window.width, Window.height);
export const TILE_WIDTH = windowSpan / 8.5;

let styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
    width: TILE_WIDTH * ROW,
    height: TILE_WIDTH * COLUMN,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outergridContainer: {
    width: TILE_WIDTH * ROW + 20,
    height: TILE_WIDTH * COLUMN + 20,
    backgroundColor: 'purple',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0px 30px rgba(255, 255, 255, 0.9)',
  },
  gridContainer: {
    width: TILE_WIDTH * ROW,
    height: TILE_WIDTH * COLUMN,
    borderWidth: 2,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStyle: {
    width: '80%',
    height: '35%',
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeading: {
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    color: 'purple',
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
  },
  lottieStyle: {
    width: '100%',
    height: '50%',
  },
});
