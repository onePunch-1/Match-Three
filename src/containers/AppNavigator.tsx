import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameScreen from '../screens/MusicPang.screen';
import Level from '../screens/Level';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Navigator initialRouteName="Level">
        <Stack.Screen
          name="Level"
          component={Level}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
};

export default AppNavigator;
