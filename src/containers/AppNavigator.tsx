import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameScreen from '../screens/MusicPang.screen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
