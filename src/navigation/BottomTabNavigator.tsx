import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';

import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateStoryStack from './CreateStoryStack';
import ProfileScreen from '../screens/ProfileScreen';
import CategoriesScreen from '../screens/CategoriesScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const BottomTabNavigator = () => {
  const { user, loading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!loading && !user) {
      // Kullanıcı yoksa SplashScreen'e yönlendir
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Splash' }],
          })
        );
      }
    }
  }, [loading, user, navigation]);

  // Yükleme durumunda loading göster
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C1E2D' }}>
        <ActivityIndicator size="large" color="#6B5DE0" />
      </View>
    );
  }

  // Kullanıcı yoksa boş ekran göster (Login'e yönlendirilecek)
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1C1E2D' }} />
    );
  }

  return (
    <Tab.Navigator
      initialRouteName="Ana Sayfa"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Arama':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Kütüphane':
              iconName = focused ? 'library' : 'library-outline';
              break;
            case 'Ana Sayfa':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Hikaye Oluştur':
              iconName = focused ? 'create' : 'create-outline';
              break;
            case 'Profil':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6B4EFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Arama" component={SearchScreen} />
      <Tab.Screen name="Kütüphane" component={LibraryScreen} />
      <Tab.Screen name="Ana Sayfa" component={HomeScreen} />
      <Tab.Screen name="Hikaye Oluştur" component={CreateStoryStack} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator; 