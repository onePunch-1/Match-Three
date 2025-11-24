import React from 'react';
import { StyleSheet, Dimensions, Animated } from 'react-native';

interface tileProps {
  location: Animated.ValueXY;
  scale: Animated.Value;
  key: number;
  img: number;
  rotate?: { dx: number; dy: number; direction: string };
}

const Tile = (props: tileProps) => {
  return (
    <Animated.Image
      source={props.img}
      style={[
        styles.tile,
        {
          transform: [
            { translateX: props.location.x },
            { translateY: props.location.y },
            { scale: props.scale },
          ],
        },
        props.rotate?.direction !== undefined && {
          transform: [
            { translateX: props.location.x },
            { translateY: props.location.y },
            { scale: props.scale },
            {
              rotate:
                props.rotate?.direction === 'horizontal' ? '90deg' : '0deg',
            },
          ],
        },
      ]}
    />
  );
};

let Window = Dimensions.get('window');
let windowSpan = Math.min(Window.width, Window.height);
let TILE_WIDTH = windowSpan / 6;

let styles = StyleSheet.create({
  tile: {
    width: TILE_WIDTH - 20,
    height: TILE_WIDTH - 20,
    position: 'absolute',
  },
});

export default Tile;
