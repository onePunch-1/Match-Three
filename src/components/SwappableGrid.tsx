import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  LayoutChangeEvent,
  Easing,
  PanResponderGestureState,
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
import { BlueJellyBean1, rocket } from '../assets/images';

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
  const [isAnimating, setIsAnimating] = useState(false);
  const gridOrigin = useRef([0, 0]);
  let invalidSwap = false;

  const config = { velocityThreshold: 0.1, directionalOffsetThreshold: 50 };

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
          await sleep(1500);
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
    if (!gestureName || gestureName === 'none' || isAnimating) {
      // Ignore null or none gesture names
      return;
    }
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
    if (isAnimating) return; // block if animation in progress

    setIsAnimating(true); // block further swipes
    const swapStarter = tileDataSource[i][j];
    const swapEnder = tileDataSource[i + dx][j + dy];
    console.log('swapStarter :::::-----', swapStarter);
    console.log('swapEnder :::::-----', swapEnder);
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
        setIsAnimating(false);
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
        setIsAnimating(false);
      }
    });
  };

  // const processMatches = (matches: number[][][]) => {
  //   setTileDataSource(state => {
  //     let newTileDataSource = state.slice();
  //     markAsMatch(matches, newTileDataSource);
  //     condenseColumns(newTileDataSource);
  //     recolorMatches(newTileDataSource);

  //     return newTileDataSource;
  //   });
  // };

  // const processMatches = (matches: number[][][]) => {
  //   setTileDataSource(state => {
  //     let newTileDataSource = [...state];

  //     matches.forEach(match => {
  //       if (match.length === 4) {
  //         // For 4 matched tiles, replace with special tile at the center
  //         // Find center tile: average of coordinates (rounded)
  //         let centerI = Math.round(
  //           match.reduce((sum, pos) => sum + pos[0], 0) / 4,
  //         );
  //         let centerJ = Math.round(
  //           match.reduce((sum, pos) => sum + pos[1], 0) / 4,
  //         );

  //         // Mark all 4 tiles for removal first
  //         match.forEach(([i, j]) => {
  //           newTileDataSource[i][j].markedAsMatch = true;
  //         });

  //         // After condensing, we will place the special tile at center
  //         // So store the special tile position to replace after condensing (handled below)
  //       } else if (match.length >= 3) {
  //         // For 3 or more tiles (other than 4), mark them as matched to remove
  //         match.forEach(([i, j]) => {
  //           newTileDataSource[i][j].markedAsMatch = true;
  //         });
  //       }
  //     });

  //     // Condense columns - this will animate matched tiles going off screen and shift tiles down
  //     condenseColumns(newTileDataSource);

  //     // After condense, replace all matched tiles that were marked (except the 4-match special case) with random beans
  //     recolorMatches(newTileDataSource);

  //     // For each 4-match, add the special tile at center position
  //     matches.forEach(match => {
  //       if (match.length === 4) {
  //         let centerI = Math.round(
  //           match.reduce((sum, pos) => sum + pos[0], 0) / 4,
  //         );
  //         let centerJ = Math.round(
  //           match.reduce((sum, pos) => sum + pos[1], 0) / 4,
  //         );
  //         console.log('Adding special tile at:', centerI, centerJ);
  //         // Replace the center tile with the special bean image and clear mark
  //         if (
  //           newTileDataSource[centerI] &&
  //           newTileDataSource[centerI][centerJ]
  //         ) {
  //           newTileDataSource[centerI][centerJ].imgObj = BlueJellyBean1;
  //           newTileDataSource[centerI][centerJ].markedAsMatch = false;
  //         }
  //       }
  //     });

  //     return newTileDataSource;
  //   });
  // };

  // const processMatches = (matches: number[][][]) => {
  //   setTileDataSource(state => {
  //     const newData = [...state];
  //     const specialTilePositions: { i: number; j: number }[] = [];

  //     matches.forEach(match => {
  //       if (match.length === 4) {
  //         const centerI = Math.round(
  //           match.reduce((sum, pos) => sum + pos[0], 0) / 4,
  //         );
  //         const centerJ = Math.round(
  //           match.reduce((sum, pos) => sum + pos[1], 0) / 4,
  //         );

  //         match.forEach(([i, j]) => {
  //           newData[i][j].markedAsMatch = true;
  //         });

  //         specialTilePositions.push({ i: centerI, j: centerJ });
  //       } else if (match.length >= 3) {
  //         match.forEach(([i, j]) => {
  //           newData[i][j].markedAsMatch = true;
  //         });
  //       }
  //     });

  //     condenseColumns(newData);
  //     recolorMatches(newData);

  //     // Assign special tile images after condensing and recoloring
  //     specialTilePositions.forEach(({ i, j }) => {
  //       if (newData[i] && newData[i][j]) {
  //         newData[i][j].imgObj = BlueJellyBean1; // your special image object
  //         newData[i][j].markedAsMatch = false;
  //       }
  //     });

  //     return newData;
  //   });
  // };
  // const processMatches = (matches: number[][][]) => {
  //   setTileDataSource(prevState => {
  //     const newData = [...prevState];

  //     matches.forEach(match => {
  //       // Handle 4-match (special tile)
  //       if (match.length === 4) {
  //         const centerI = Math.round(
  //           match.reduce((s, pos) => s + pos[0], 0) / 4,
  //         );
  //         const centerJ = Math.round(
  //           match.reduce((s, pos) => s + pos[1], 0) / 4,
  //         );

  //         // Mark only the 3 tiles for removal
  //         match.forEach(([i, j]) => {
  //           if (!(i === centerI && j === centerJ)) {
  //             newData[i][j].markedAsMatch = true;
  //           }
  //         });

  //         // Center tile becomes SPECIAL immediately, not removed
  //         newData[centerI][centerJ].imgObj = BEAN_OBJS[6];
  //         newData[centerI][centerJ].markedAsMatch = false;
  //       }

  //       // Normal match (3 or more)
  //       else if (match.length >= 3) {
  //         match.forEach(([i, j]) => {
  //           newData[i][j].markedAsMatch = true;
  //         });
  //       }
  //     });

  //     // Collapse columns (drops tiles down)
  //     condenseColumns(newData);

  //     // RECOLOR + FALL animation for replaced tiles
  //     newData.forEach((row, rowIndex) => {
  //       row.forEach((tile, colIndex) => {
  //         if (tile.markedAsMatch) {
  //           // Assign random bean image
  //           const rand = getRandomInt(7);
  //           tile.imgObj = BEAN_OBJS[rand];
  //           tile.markedAsMatch = false;

  //           // Get current X
  //           const currentX = (tile.location.x as any)._value;

  //           // Reset Y above the grid
  //           tile.location.setValue({
  //             x: currentX,
  //             y: -COLUMN * TILE_WIDTH, // above the screen
  //           });

  //           // Animate FALLING
  //           Animated.timing(tile.location, {
  //             toValue: {
  //               x: currentX,
  //               y: TILE_WIDTH * colIndex, // correct final Y position
  //             },
  //             duration: 400,
  //             easing: Easing.bezier(0.85, 0, 0.15, 1),
  //             useNativeDriver: true,
  //           }).start();
  //         }
  //       });
  //     });

  //     return newData;
  //   });
  // };

  const processMatches = (matches: number[][][]) => {
    setTileDataSource(state => {
      const newData = [...state];

      const specialTileCenters: { i: number; j: number }[] = [];

      // 1. Mark matched tiles & detect 5-match center
      matches.forEach(match => {
        if (match.length >= 5) {
          // Compute center tile
          const centerI = Math.round(
            match.reduce((sum, pos) => sum + pos[0], 0) / 5,
          );
          const centerJ = Math.round(
            match.reduce((sum, pos) => sum + pos[1], 0) / 5,
          );

          specialTileCenters.push({ i: centerI, j: centerJ });

          // Mark ALL 4 tiles
          match.forEach(([i, j]) => {
            newData[i][j].markedAsMatch = true;
          });

          // Immediately UNMARK center tile — it will become special
          newData[centerI][centerJ].markedAsMatch = false;
          newData[centerI][centerJ].imgObj = rocket;

          // 2. Mark matched tiles & detect 4-match center
        } else if (match.length === 4) {
          // Compute center tile
          const centerI = Math.round(
            match.reduce((sum, pos) => sum + pos[0], 0) / 4,
          );
          const centerJ = Math.round(
            match.reduce((sum, pos) => sum + pos[1], 0) / 4,
          );

          specialTileCenters.push({ i: centerI, j: centerJ });

          // Mark ALL 4 tiles
          match.forEach(([i, j]) => {
            newData[i][j].markedAsMatch = true;
          });

          // Immediately UNMARK center tile — it will become special
          newData[centerI][centerJ].markedAsMatch = false;
          newData[centerI][centerJ].imgObj = rocket;
        } else if (match.length >= 3) {
          // Normal matches (3, 5, L, T shapes, etc.)
          match.forEach(([i, j]) => {
            newData[i][j].markedAsMatch = true;
          });
        }
      });

      // 2. Condense (special tile stays fixed!)
      condenseColumns(newData);

      // 3. Only refill tiles that are still marked after condense → 3 new tiles for a 4-match
      recolorMatches(newData);

      return newData;
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
        onSwipeUp={state => onSwipe(swipeDirections.SWIPE_UP, state)}
        onSwipeDown={state => onSwipe(swipeDirections.SWIPE_DOWN, state)}
        onSwipeLeft={state => onSwipe(swipeDirections.SWIPE_LEFT, state)}
        onSwipeRight={state => onSwipe(swipeDirections.SWIPE_RIGHT, state)}
      >
        {renderTiles(tileDataSource)}
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
export const TILE_WIDTH = windowSpan / 9;

let styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
    width: TILE_WIDTH * ROW,
    height: TILE_WIDTH * COLUMN,
    position: 'absolute',
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
