import 'react-native-reanimated';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import EditProfileScreen from './src/screens/EditProfileScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';
import ChapterDetailScreen from './src/screens/ChapterDetailScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import OtherProfileScreen from './src/screens/OtherProfileScreen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootStackParamList } from './src/navigation/types';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Splash"
      screenOptions={{ 
        headerShown: false,
        animation: 'none'
      }}
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="Home" 
        component={BottomTabNavigator}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name='EditProfile'
        component={EditProfileScreen}
        options={{gestureEnabled: true}}
      />
      <Stack.Screen 
        name="BookDetail" 
        component={BookDetailScreen}
        options={{ 
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="ChapterDetail" 
        component={ChapterDetailScreen}
        options={{ 
          headerTransparent: true,
          headerTintColor: '#fff',
          headerTitle: '',
          gestureEnabled: true,
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen}
        options={{ 
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="Categories" 
        component={CategoriesScreen}
        options={{ 
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="OtherProfile" 
        component={OtherProfileScreen}
        options={{ 
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right'
        }} 
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
} 