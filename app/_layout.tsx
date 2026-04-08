import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { loadSettings } from '../src/store/useStore';

export default function RootLayout() {
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0A0F' },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: '#0A0A0F' },
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'App Factory',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#12121A' },
          }} 
        />
        <Stack.Screen 
          name="projects" 
          options={{ 
            title: 'Projects',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#12121A' },
          }} 
        />
        <Stack.Screen 
          name="github" 
          options={{ 
            title: 'GitHub Dashboard',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#12121A' },
          }} 
        />
      </Stack>
    </>
  );
}
