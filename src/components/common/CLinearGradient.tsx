import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated from 'react-native-reanimated';

export const CLinearGradient = ({
  children,
  colors,
  style = {},
  gradientStyle = {},
  pointerEvents,
  start,
  end,
  ...props
}: {
  children?: any;
  colors: any;
  style?: any;
  gradientStyle?: any;
  pointerEvents?: any;
  start?: any;
  end?: any;
  props?: any;
}) => {
  const localStyles = makeStyle();
  return (
    <Animated.View
      style={[{ overflow: 'hidden' }, style]}
      pointerEvents={pointerEvents}
    >
      <LinearGradient
        start={start}
        end={end}
        {...props}
        style={[localStyles.container, gradientStyle]}
        colors={colors}
      />
      {children}
    </Animated.View>
  );
};

const makeStyle = () =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
    },
  });
