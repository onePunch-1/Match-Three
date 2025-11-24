/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  LayoutChangeEvent,
  Easing,
  PanResponderGestureState,
  Pressable,
} from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';
import {
  getRandomInt,
  getAllMatches,
  condenseColumns,
  findMoves,
  sleep,
} from '../lib/GridApi';
import { BEAN_OBJS, ROCKET_OBJ } from '../lib/Images';
import { TileData, TileDataType } from '../lib/TileData';
import Tile from './Tile';
import { ROW, COLUMN } from '../lib/spec';
import EmptyMovesModal from './modal/emptyMovesModal';
import EmptyMoves from '../assets/images/lottie/no_more_moves.json';

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
      if (!findMoves(tileDataSource)) {
        await sleep(1500);
        setShowNoMoves(true);
        await sleep(1500);
        setShowNoMoves(false);
        setBlockScreen('');
        setTileDataSource(initializeDataSource());
      }
    })();
  }, [tileDataSource]);

  useEffect(() => {
    if (blockScreen.length) {
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
          if (blockScreen.length) {
            setBlockScreen('');
          }
        });
      });
    });
  };

  const blastRocket = (
    rocketPos: { i: number; j: number },
    direction: 'horizontal' | 'vertical',
  ) => {
    setTileDataSource(old => {
      const newData = [...old];
      const { i, j } = rocketPos;
      let tilesToBlast: number[][] = [];
      if (direction === 'horizontal') {
        for (let row = 0; row < ROW; row++) {
          tilesToBlast.push([row, j]);
        }
      } else if (direction === 'vertical') {
        for (let col = 0; col < COLUMN; col++) {
          tilesToBlast.push([i, col]);
        }
      } else {
        for (let row = 0; row < ROW; row++) {
          tilesToBlast.push([row, j]);
        }
      }
      tilesToBlast.forEach(([r, c]) => {
        newData[r][c].markedAsMatch = true;
      });

      condenseColumns(newData);
      recolorMatches(newData);
      return newData;
    });

    const blasted = direction === 'horizontal' ? COLUMN : ROW;
    setScore(score => score + blasted * 100);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    gridOrigin.current = [
      event.nativeEvent.layout.x,
      event.nativeEvent.layout.y,
    ];
  };

  const handleTilePress = (i: number, j: number) => {
    let allMatches = getAllMatches(tileDataSource);
    let matched =
      allMatches.find(group => {
        return group.some(pair => pair[0] === i && pair[1] === j);
      }) || [];

    if (matched.length !== 0) {
      setMoveCount(moveCount => (moveCount += 1));
      processMatches([matched], i, j);
      setScore(score => score + matched.length * 100);
    }
    const isRocket = tileDataSource[i][j].imgObj?.color === 999;
    if (!isRocket) return;

    const neighbors = [
      [i - 1, j],
      [i + 1, j],
      [i, j - 1],
      [i, j + 1],
    ];
    let adjacentRocket = null;
    neighbors.forEach(([x, y]) => {
      if (
        x >= 0 &&
        y >= 0 &&
        x < ROW &&
        y < COLUMN &&
        tileDataSource[x][y].imgObj?.color === 999
      ) {
        adjacentRocket = { x, y };
      }
    });
    if (adjacentRocket) {
      const rocketPos = { i, j };
      blastRocket(rocketPos, 'horizontal');
      blastRocket(rocketPos, 'vertical');
      setIsAnimating(false);
      return;
    }
    const rocketDirection = tileDataSource[i][j].direction as {
      dx: number;
      dy: number;
      direction: 'horizontal' | 'vertical';
    };
    if (isRocket) {
      const rocketPos = { i, j };
      const direction =
        rocketDirection?.dx !== undefined
          ? rocketDirection?.dx !== 0
            ? 'horizontal'
            : 'vertical'
          : rocketDirection.direction;

      blastRocket(rocketPos, direction);
      setIsAnimating(false);
      return;
    }
  };

  const renderTiles = (tileData: TileDataType[][]) => {
    const tiles = tileData.map((row, i) =>
      row.map((e, j) => (
        <Pressable
          key={e.key}
          onPress={() => handleTilePress(i, j)}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <Tile
            location={e.location}
            scale={e.scale}
            key={e.key}
            img={e.imgObj?.image}
            rotate={
              e?.direction as { dx: number; dy: number; direction: string }
            }
          />
        </Pressable>
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

  const getMatchDirection = (match: number[][]) => {
    const rows = match.map(([i, _]) => i);
    const cols = match.map(([_, j]) => j);

    const allSameRow = rows.every(r => r === rows[0]);
    const allSameCol = cols.every(c => c === cols[0]);

    if (allSameRow) {
      // horizontal match → rocket blows left/right
      return { dx: 1, dy: 0, direction: 'vertical' };
    }

    if (allSameCol) {
      // vertical match → rocket blows up/down
      return { dx: 0, dy: 1, direction: 'horizontal' };
    }

    // shape match — default logic (usually choose direction with more spread)
    const rowSpread = Math.max(...rows) - Math.min(...rows);
    const colSpread = Math.max(...cols) - Math.min(...cols);

    if (rowSpread > colSpread) {
      return { dx: 1, dy: 0 }; // more vertical than horizontal
    } else {
      return { dx: 0, dy: 1 }; // more horizontal than vertical
    }
  };

  const swap = (i: number, j: number, dx: number, dy: number) => {
    if (isAnimating) return; // block if animation in progress

    setIsAnimating(true); // block further swipes
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
      let matched =
        allMatches.find(group => {
          return group.some(
            pair =>
              (pair[0] === i + dx && pair[1] === j + dy) ||
              (pair[0] === j + dy && pair[1] === i + dx) ||
              (pair[0] === i && pair[1] === j) ||
              (pair[0] === j && pair[1] === i),
          );
        }) || [];

      if (matched.length !== 0) {
        setMoveCount(moveCount => (moveCount += 1));
        setScore(score => score + matched.length * 100);
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

  const processMatches = (matches: number[][][], dx?: number, dy?: number) => {
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
          const dir = getMatchDirection(match);
          specialTileCenters.push({ i: centerI, j: centerJ });

          // Mark ALL 4 tiles
          match.forEach(([i, j]) => {
            newData[i][j].markedAsMatch = true;
          });

          // Immediately UNMARK center tile — it will become special
          newData[centerI][centerJ].markedAsMatch = false;
          newData[centerI][centerJ].imgObj = ROCKET_OBJ;
          newData[centerI][centerJ].direction = {
            dx,
            dy,
            direction: dir.direction || 'horizontal',
          };

          // 2. Mark matched tiles & detect 4-match center
        } else if (match.length === 4) {
          // Compute center tile
          const centerI = Math.round(
            match.reduce((sum, pos) => sum + pos[0], 0) / 4,
          );
          const centerJ = Math.round(
            match.reduce((sum, pos) => sum + pos[1], 0) / 4,
          );

          const dir = getMatchDirection(match);
          specialTileCenters.push({ i: centerI, j: centerJ });

          // Mark ALL 4 tiles
          match.forEach(([i, j]) => {
            newData[i][j].markedAsMatch = true;
          });

          // Immediately UNMARK center tile — it will become special
          newData[centerI][centerJ].markedAsMatch = false;
          newData[centerI][centerJ].imgObj = ROCKET_OBJ;
          newData[centerI][centerJ].direction = {
            dx,
            dy,
            direction: dir.direction || 'horizontal',
          };
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
        if (e.markedAsMatch) {
          let randIndex = getRandomInt(7);
          let randomBeanObj = BEAN_OBJS[randIndex];
          e.direction = {};
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
