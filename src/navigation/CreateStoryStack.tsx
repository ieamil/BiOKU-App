import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import NewStory from '../screens/NewStory';
import AddNewChapter from '../screens/AddNewChapter';
import EditChapter from '../screens/EditChapter'; // <-- EKLENDİ

export type CreateStoryStackParamList = {
  CreateStoryMain: undefined;
  NewStory: { bookId?: string };
  AddNewChapter: { bookId: string };
  EditChapter: { chapterId: string }; // <-- EKLENDİ
};

const Stack = createNativeStackNavigator<CreateStoryStackParamList>();

const CreateStoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1C1E2D',
        },
        headerTintColor: '#6B4EFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#fff',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="CreateStoryMain" 
        component={CreateStoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NewStory" 
        component={NewStory}
        options={{ 
          headerBackTitle: 'Geri',
        }}
      />
      <Stack.Screen 
        name="AddNewChapter" 
        component={AddNewChapter}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="EditChapter"
        component={EditChapter}
        options={{
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};

export default CreateStoryStack;
