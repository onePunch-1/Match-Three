// Final Level.tsx - SIMPLIFIED VERSION WITH GUARANTEED VISIBLE TEXT
import React, { useMemo, memo, useCallback, useRef, useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  Text as RNText,
} from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Group,
  Shadow,
  SkPath,
} from '@shopify/react-native-skia';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types & Interfaces
interface LevelData {
  id: number;
  x: number;
  y: number;
  completed: boolean;
  stars: number;
  current: boolean;
  locked: boolean;
  curveType: 'peak-right' | 'peak-left';
}

interface Segment {
  id: number;
  start: number;
  levels: LevelData[];
  backgroundColor: string;
}

interface SegmentContentProps {
  levels: LevelData[];
  segmentStart: number;
  backgroundColor: string;
  totalHeight: number;
  allLevels: LevelData[];
}

// Configuration
const CONFIG = {
  AMPLITUDE: 90,
  FREQUENCY: 0.015,
  NUM_LEVELS: 10,
  CENTER_X: SCREEN_WIDTH / 2,
  NODE_RADIUS: 32,
  SEGMENT_HEIGHT: SCREEN_HEIGHT * 0.15,
  NODE_BUFFER: 100,
} as const;

// Background colors for every 10 levels
const BACKGROUND_COLORS = [
  '#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#FCE4EC',
  '#E0F2F1', '#FFF9C4', '#FFEBEE', '#E1F5FE', '#F1F8E9',
];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// Function to calculate X position on sine wave at given Y
const getSineWaveX = (
  y: number,
  frequency: number,
  amplitude: number,
  centerX: number,
): number => {
  return centerX + Math.sin(y * frequency) * amplitude;
};

// Function to calculate EXACT curve points (peaks and troughs)
const calculateCurvePoints = (
  numLevels: number,
  frequency: number,
  amplitude: number,
  centerX: number,
) => {
  const curvePoints: Array<{
    id: number;
    x: number;
    y: number;
    curveType: 'peak-right' | 'peak-left';
  }> = [];

  for (let i = 0; i < numLevels; i++) {
    const n = i;
    const y = (Math.PI / 2 + n * Math.PI) / frequency;

    const isPeakRight = i % 2 === 0;
    const curveType: 'peak-right' | 'peak-left' = isPeakRight
      ? 'peak-right'
      : 'peak-left';

    const x = getSineWaveX(y, frequency, amplitude, centerX);

    curvePoints.push({
      id: i + 1,
      x,
      y,
      curveType,
    });
  }

  return curvePoints;
};

// Main Component
const Level: React.FC = memo(() => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useSharedValue(0);
  const [levelsState, setLevelsState] = React.useState<LevelData[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Generate curve points for levels
  const curvePoints = useMemo(() => {
    return calculateCurvePoints(
      CONFIG.NUM_LEVELS,
      CONFIG.FREQUENCY,
      CONFIG.AMPLITUDE,
      CONFIG.CENTER_X,
    );
  }, []);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (curvePoints.length === 0) return 1000;
    const maxY = Math.max(...curvePoints.map(p => p.y));
    return maxY + 300;
  }, [curvePoints]);

  // Generate levels - BOTTOM TO TOP
  const initialLevels = useMemo<LevelData[]>(() => {
    return curvePoints.map((point, index) => ({
      id: point.id,
      x: point.x,
      y: totalHeight - point.y,
      curveType: point.curveType,
      completed: index < 5,
      stars: index < 5 ? Math.floor(Math.random() * 3) + 1 : 0,
      current: index === 5,
      locked: index > 5,
    }));
  }, [curvePoints, totalHeight]);

  useEffect(() => {
    setLevelsState(initialLevels);
  }, [initialLevels]);

  const numSegments = Math.ceil(totalHeight / CONFIG.SEGMENT_HEIGHT);

  // Scroll to center current level
  const scrollToLevel = useCallback(
    (levelY: number, animated: boolean = true) => {
      const targetScrollY = levelY - SCREEN_HEIGHT / 2;
      const clampedScrollY = Math.max(
        0,
        Math.min(targetScrollY, totalHeight - SCREEN_HEIGHT),
      );

      scrollViewRef.current?.scrollTo({
        y: clampedScrollY,
        animated: animated,
      });
    },
    [totalHeight],
  );

  // Center current level on mount
  useEffect(() => {
    if (levelsState.length > 0 && !isInitialized) {
      const currentLevel = levelsState.find(level => level.current);
      if (currentLevel) {
        setTimeout(() => {
          scrollToLevel(currentLevel.y, false);
          setIsInitialized(true);
        }, 100);
      }
    }
  }, [levelsState, scrollToLevel, isInitialized]);

  // Handle level press
  const handleLevelPress = useCallback(
    (level: LevelData) => {
      if (level.locked) {
        Alert.alert(
          'Level Locked 🔒',
          `Complete Level ${level.id - 1} to unlock this level.`,
        );
        return;
      }

      if (level.completed) {
        Alert.alert(
          `Level ${level.id} Completed ✅`,
          `You earned ${level.stars} stars! Play again?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replay',
              onPress: () => {
                console.log('Replaying level:', level.id);
              },
            },
          ],
        );
        return;
      }

      if (level.current) {
        Alert.alert(`Level ${level.id} 🎮`, 'Complete this level?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: () => {
              setLevelsState(prevLevels => {
                return prevLevels.map(lvl => {
                  if (lvl.id === level.id) {
                    return {
                      ...lvl,
                      completed: true,
                      current: false,
                      stars: Math.floor(Math.random() * 3) + 1,
                    };
                  } else if (lvl.id === level.id + 1) {
                    return {
                      ...lvl,
                      current: true,
                      locked: false,
                    };
                  }
                  return lvl;
                });
              });

              setTimeout(() => {
                const nextLevel = levelsState.find(
                  lvl => lvl.id === level.id + 1,
                );
                if (nextLevel) {
                  scrollToLevel(nextLevel.y, true);
                }
              }, 500);
            },
          },
        ]);
      }
    },
    [levelsState, scrollToLevel],
  );

  // Get background color
  const getBackgroundColor = useCallback(
    (segmentStart: number): string => {
      const levelNumber = Math.floor((totalHeight - segmentStart) / 200);
      const colorIndex =
        Math.floor(levelNumber / 10) % BACKGROUND_COLORS.length;
      return BACKGROUND_COLORS[colorIndex];
    },
    [totalHeight],
  );

  // Split into segments with buffer for nodes
  const segments = useMemo<Segment[]>(() => {
    const segs: Segment[] = [];
    for (let i = 0; i < numSegments; i++) {
      const segmentStart = i * CONFIG.SEGMENT_HEIGHT;
      const segmentEnd = (i + 1) * CONFIG.SEGMENT_HEIGHT;

      const segmentLevels = levelsState.filter(
        level =>
          level.y >= segmentStart - CONFIG.NODE_BUFFER &&
          level.y < segmentEnd + CONFIG.NODE_BUFFER,
      );

      segs.push({
        id: i,
        start: segmentStart,
        levels: segmentLevels,
        backgroundColor: getBackgroundColor(segmentStart),
      });
    }
    return segs;
  }, [levelsState, numSegments, getBackgroundColor]);

  return (
    <View style={styles.container}>
      <AnimatedScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: totalHeight }}>
          {/* Layer 1: Background colors */}
          {segments.map(segment => (
            <View
              key={`bg-${segment.id}`}
              style={{
                position: 'absolute',
                top: segment.start,
                width: SCREEN_WIDTH,
                height: CONFIG.SEGMENT_HEIGHT,
                backgroundColor: segment.backgroundColor,
                zIndex: 1,
              }}
            />
          ))}

          {/* Layer 2: Paths (Sine wave and completed paths) */}
          {segments.map(segment => {
            const canvasHeight = Math.min(
              CONFIG.SEGMENT_HEIGHT + CONFIG.NODE_BUFFER * 2,
              3000
            );
            const canvasTop = segment.start - CONFIG.NODE_BUFFER;

            return (
              <View
                key={`canvas-${segment.id}`}
                style={{
                  position: 'absolute',
                  top: canvasTop,
                  left: 0,
                  width: SCREEN_WIDTH,
                  height: canvasHeight,
                  zIndex: 2,
                }}
                pointerEvents="none"
              >
                <Canvas style={{ width: SCREEN_WIDTH, height: canvasHeight }}>
                  <SegmentContent
                    levels={segment.levels}
                    segmentStart={canvasTop}
                    backgroundColor={segment.backgroundColor}
                    totalHeight={totalHeight}
                    allLevels={levelsState}
                  />
                </Canvas>
              </View>
            );
          })}

          {/* Layer 3: Level nodes with React Native Text (GUARANTEED VISIBLE) */}
          {levelsState.map(level => {
            const nodeSize = CONFIG.NODE_RADIUS * 2;
            const getColors = () => {
              if (level.locked) return { bg: '#BDBDBD', text: '#FFFFFF' };
              if (level.current) return { bg: '#42A5F5', text: '#FFFFFF' };
              if (level.completed) return { bg: '#66BB6A', text: '#FFFFFF' };
              return { bg: '#9C27B0', text: '#FFFFFF' };
            };
            const colors = getColors();

            return (
              <View
                key={`node-${level.id}`}
                style={{
                  position: 'absolute',
                  left: level.x - CONFIG.NODE_RADIUS,
                  top: level.y - CONFIG.NODE_RADIUS,
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: CONFIG.NODE_RADIUS,
                  backgroundColor: colors.bg,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  zIndex: 5,
                }}
                pointerEvents="none"
              >
                <RNText
                  style={{
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: 'bold',
                    textAlign: 'center',
                  }}
                >
                  {level.id}
                </RNText>
              </View>
            );
          })}

          {/* Layer 4: Indicators (stars, locks, play icons) */}
          {levelsState.map(level => (
            <View
              key={`indicator-${level.id}`}
              style={{
                position: 'absolute',
                left: level.x - 30,
                top: level.y + CONFIG.NODE_RADIUS + 5,
                width: 60,
                alignItems: 'center',
                zIndex: 6,
              }}
              pointerEvents="none"
            >
              {level.completed && level.stars > 0 && (
                <RNText style={{ fontSize: 14 }}>
                  {Array(level.stars).fill('⭐').join('')}
                  {Array(3 - level.stars).fill('☆').join('')}
                </RNText>
              )}
              {level.locked && <RNText style={{ fontSize: 18 }}>🔒</RNText>}
              {level.current && <RNText style={{ fontSize: 16 }}>▶️</RNText>}
            </View>
          ))}

          {/* Layer 5: Touch overlays (Highest) */}
          {levelsState.map(level => {
            const touchSize = CONFIG.NODE_RADIUS * 2.5;
            return (
              <TouchableOpacity
                key={`touch-${level.id}`}
                style={{
                  position: 'absolute',
                  left: level.x - touchSize / 2,
                  top: level.y - touchSize / 2,
                  width: touchSize,
                  height: touchSize,
                  borderRadius: touchSize / 2,
                  zIndex: 10,
                }}
                onPress={() => handleLevelPress(level)}
                activeOpacity={0.7}
              />
            );
          })}
        </View>
      </AnimatedScrollView>
    </View>
  );
});

// Segment Content Component - ONLY for paths
const SegmentContent: React.FC<SegmentContentProps> = memo(
  ({ levels, segmentStart, totalHeight, allLevels }) => {
    // Create sine wave path
    const path = useMemo<SkPath>(() => {
      const p = Skia.Path.Make();

      const firstLevel = allLevels[0];
      const lastLevel = allLevels[allLevels.length - 1];

      if (!firstLevel || !lastLevel) return p;

      const segmentEnd = segmentStart + CONFIG.SEGMENT_HEIGHT + CONFIG.NODE_BUFFER * 2;

      const pathStartY = Math.max(segmentStart, lastLevel.y);
      const pathEndY = Math.min(segmentEnd, firstLevel.y);

      if (pathStartY >= pathEndY) return p;

      let started = false;
      for (let y = pathStartY; y <= pathEndY; y += 2) {
        const yFromBottom = totalHeight - y;
        const x = getSineWaveX(
          yFromBottom,
          CONFIG.FREQUENCY,
          CONFIG.AMPLITUDE,
          CONFIG.CENTER_X,
        );
        const localY = y - segmentStart;

        if (!started) {
          p.moveTo(x, localY);
          started = true;
        } else {
          p.lineTo(x, localY);
        }
      }

      return p;
    }, [segmentStart, totalHeight, allLevels]);

    // Draw completed path segments
    const completedPaths = useMemo(() => {
      const paths: { from: LevelData; to: LevelData }[] = [];
      const sortedAllLevels = [...allLevels].sort((a, b) => a.id - b.id);

      for (let i = 0; i < sortedAllLevels.length - 1; i++) {
        const currentLevel = sortedAllLevels[i];
        const nextLevel = sortedAllLevels[i + 1];

        if (currentLevel && nextLevel && currentLevel.completed) {
          const segmentEnd = segmentStart + CONFIG.SEGMENT_HEIGHT + CONFIG.NODE_BUFFER * 2;
          const pathMinY = Math.min(currentLevel.y, nextLevel.y);
          const pathMaxY = Math.max(currentLevel.y, nextLevel.y);

          if (pathMaxY >= segmentStart && pathMinY <= segmentEnd) {
            paths.push({ from: currentLevel, to: nextLevel });
          }
        }
      }

      return paths;
    }, [allLevels, segmentStart]);

    return (
      <Group>
        {/* Background decorative path */}
        <Path
          path={path}
          color="#D4D4D4"
          style="stroke"
          strokeWidth={15}
          strokeCap="round"
          opacity={0.2}
        />

        {/* Main sine wave path */}
        <Path
          path={path}
          color="#9E9E9E"
          style="stroke"
          strokeWidth={8}
          strokeCap="round"
          opacity={0.4}
        />

        {/* Completed path segments (green) */}
        {completedPaths.map(({ from, to }) => {
          const pathSegment = Skia.Path.Make();
          const fromLocalY = from.y - segmentStart;

          pathSegment.moveTo(from.x, fromLocalY);

          const steps = 50;
          for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const y = from.y + (to.y - from.y) * progress;
            const yFromBottom = totalHeight - y;
            const x = getSineWaveX(
              yFromBottom,
              CONFIG.FREQUENCY,
              CONFIG.AMPLITUDE,
              CONFIG.CENTER_X,
            );
            const localY = y - segmentStart;
            pathSegment.lineTo(x, localY);
          }

          return (
            <Path
              key={`completed-${from.id}-${to.id}`}
              path={pathSegment}
              color="#4CAF50"
              style="stroke"
              strokeWidth={10}
              strokeCap="round"
            >
              <Shadow dx={0} dy={2} blur={4} color="rgba(76, 175, 80, 0.4)" />
            </Path>
          );
        })}
      </Group>
    );
  },
);

Level.displayName = 'Level';
SegmentContent.displayName = 'SegmentContent';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});

export default Level;
