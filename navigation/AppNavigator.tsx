import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import LoginScreen from '../screens/LoginScreen';
import CustomerSignupScreen from '../screens/CustomerSignupScreen';
import MechanicSignupScreen from '../screens/MechanicSignupScreen';
import CustomerHomeScreen from '../screens/CustomerHomeScreen';
import MechanicHomeScreen from '../screens/MechanicHomeScreen';
import ChatScreen from '../screens/ChatScreen';

export type RootStackParamList = {
  Login: undefined;
  CustomerSignup: undefined;
  MechanicSignup: undefined;
  CustomerHome: undefined;
  MechanicHome: undefined;
  Chat: { requestId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { currentUser } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!currentUser ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="CustomerSignup" component={CustomerSignupScreen} />
            <Stack.Screen name="MechanicSignup" component={MechanicSignupScreen} />
          </>
        ) : currentUser.userType === 'customer' ? (
          <>
            <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MechanicHome" component={MechanicHomeScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;