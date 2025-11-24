import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Canvas,
  Path as SkiaPath,
  Skia,
  LinearGradient,
  vec,
  Group,
  Rect,
  Circle,
  Image,       // Added
  useImage,    // Added
} from '@shopify/react-native-skia';

// --- CONFIGURATION ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STRUCTURE_WIDTH = SCREEN_WIDTH;
const STRUCTURE_HEIGHT = SCREEN_HEIGHT;
const MAX_DRAG = STRUCTURE_HEIGHT * 2.0;

// --- COLORS ---
const COLOR_SKY = '#050b18';
const COLOR_GROUND_1 = '#E056FD';
const COLOR_GROUND_2 = '#4a3b78';
const COLOR_OBJECT = '#ffffff';
const COLOR_CIRCLE = '#ffb347';
// const COLOR_CARD_BG = '#f0f0f0'; // No longer needed for image

// --- GEOMETRY ---
const ITEM_WIDTH = SCREEN_WIDTH;
const ITEM_HEIGHT = 200;

// 1. Visual Top of the Hill
const HILL_TOP_Y = STRUCTURE_HEIGHT * 0.35;
// 2. Sphere Radius
const SPHERE_RADIUS = SCREEN_WIDTH * 1.5;
// 3. Center of Rotation
const CENTER_X = STRUCTURE_WIDTH / 2;
const CENTER_Y = HILL_TOP_Y + SPHERE_RADIUS;

const DOME_PATH = Skia.Path.Make();
DOME_PATH.addCircle(CENTER_X, CENTER_Y, SPHERE_RADIUS);

const TOP_ANGLE = -Math.PI / 2;

// ---------------- 2. PROJECTION LOGIC ----------------
type Projection = {
  cx: number;
  cy: number;
  scale: number;
  rotateX: number;
  opacity: number;
  isBackSide: boolean;
  angle: number;
  zIndex: number;
};

const safe = (val: number) => {
  'worklet';
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return val;
};

const projectItem = (progress: number): Projection => {
  'worklet';

  const START_ANGLE = TOP_ANGLE + 1.8; 
  const END_ANGLE = TOP_ANGLE - 1.8;

  const angle = START_ANGLE + progress * (END_ANGLE - START_ANGLE);

  const z = safe(SPHERE_RADIUS * Math.cos(angle));
  const yRaw = safe(SPHERE_RADIUS * Math.sin(angle));

  const centerY = CENTER_Y + yRaw;
  const centerX = CENTER_X;
  const rotateX = -angle;

  const cameraDist = SPHERE_RADIUS * 2.0;
  const scale = safe(cameraDist / (cameraDist - z));

  // Strict Horizon Sorting (Prevents white cap/image cap artifacts)
  const isBackSide = angle < TOP_ANGLE;

  return {
    cx: centerX,
    cy: centerY,
    scale: Math.max(0.1, scale),
    rotateX,
    opacity: 1,
    isBackSide,
    angle,
    zIndex: z,
  };
};

// ---------------- 3. COMPONENTS ----------------

const LevelCardBase: React.FC<{ projection: Projection }> = ({
  projection,
}) => {
  // 1. Load Test Image
  const image = useImage("https://picsum.photos/seed/picsum/600/400");

  const { cx, cy, scale, rotateX, opacity } = projection;
  if (!Number.isFinite(cx)) return null;

  // 2. Wait for image load
  if (!image) return null; 

  const transform = [
    { perspective: 5000 },
    { translateX: cx },
    { translateY: cy },
    { rotateX },
    { scale },
    { translateX: -ITEM_WIDTH / 2 },
    { translateY: -ITEM_HEIGHT / 2 },
  ];

  return (
    <Group transform={transform} opacity={opacity}>
      {/* 3. Replace Rect with Image */}
      <Image
        image={image}
        x={0}
        y={0}
        width={ITEM_WIDTH}
        height={ITEM_HEIGHT}
        fit="cover"
      />
    </Group>
  );
};

const LevelObject: React.FC<{ projection: Projection; index: number }> = ({
  projection,
  index,
}) => {
  const { cx, cy, scale, rotateX, opacity } = projection;
  if (!Number.isFinite(cx)) return null;

  const transform = [
    { perspective: 5000 },
    { translateX: cx },
    { translateY: cy },
    { rotateX },
    { scale },
    { translateX: -ITEM_WIDTH / 2 },
    { translateY: -ITEM_HEIGHT / 1.8 },
  ];

  const localCx = ITEM_WIDTH / 2;
  const localCy = ITEM_HEIGHT * 0.5;

  return (
    <Group transform={transform} opacity={opacity}>
        <Circle
          cx={localCx}
          cy={localCy}
          r={ITEM_HEIGHT * 0.3}
          color={COLOR_CIRCLE}
        />
         <Circle
          cx={localCx}
          cy={localCy}
          r={ITEM_HEIGHT * 0.15}
          color={COLOR_OBJECT}
        />
    </Group>
  );
};

// ---------------- 4. SCENE ----------------

const SkiaScene: React.FC<{ progress: number }> = ({ progress }) => {
  const backItems = [];
  const frontItems = [];
  const TOTAL_ITEMS = 1;

  for (let i = 0; i < TOTAL_ITEMS; i++) {
    let itemProgress = progress % 1.5;
    if (itemProgress < 0) itemProgress += 1.5;

    const proj = projectItem(itemProgress);
    const itemData = { key: i, index: i, proj };
    
    if (proj.isBackSide) {
      backItems.push(itemData);
    } else {
      frontItems.push(itemData);
    }
  }

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* 1. SKY */}
      <Rect width={STRUCTURE_WIDTH} height={STRUCTURE_HEIGHT} color={COLOR_SKY} />

      {/* 2. BACK ITEMS (Behind Hill) */}
      {backItems.map(item => (
          <LevelObject key={item.key} index={item.index} projection={item.proj} />
      ))}

      {/* 3. THE HILL */}
      <SkiaPath path={DOME_PATH} style="fill">
        <LinearGradient
          start={vec(0, HILL_TOP_Y)}
          end={vec(0, STRUCTURE_HEIGHT)}
          colors={[COLOR_GROUND_1, COLOR_GROUND_2]}
        />
      </SkiaPath>

      {/* 4. FRONT ITEMS (On Top of Hill) */}
      {frontItems.map(item => (
        <React.Fragment key={item.key}>
          
          {/* Base (IMAGE): Clipped to DOME_PATH */}
          <Group clip={DOME_PATH}>
              <LevelCardBase projection={item.proj} />
          </Group>
          
          {/* Object: Drawn on top */}
          <LevelObject index={item.index} projection={item.proj} />
        </React.Fragment>
      ))}
    </Canvas>
  );
};

// ---------------- 5. MAIN ----------------

const Level: React.FC = () => {
  const progressSV = useSharedValue(0);
  const startProgress = useSharedValue(0);
  const [progress, setProgress] = useState(0);

  useAnimatedReaction(
    () => progressSV.value,
    v => runOnJS(setProgress)(v),
    [progressSV],
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startProgress.value = progressSV.value;
    })
    .onUpdate(event => {
      const delta = -event.translationY / MAX_DRAG;
      progressSV.value = startProgress.value + delta;
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.screen}>
        <View style={styles.domeArea}>
          <SkiaScene progress={progress} />
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR_SKY },
  domeArea: { width: STRUCTURE_WIDTH, height: STRUCTURE_HEIGHT },
});

export default React.memo(Level);