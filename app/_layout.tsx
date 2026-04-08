import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0A0F' },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: '#0A0A0F' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
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
            headerStyle: { backgroundColor: '#12121A' },
          }} 
        />
        <Stack.Screen 
          name="github" 
          options={{ 
            title: 'GitHub',
            headerStyle: { backgroundColor: '#12121A' },
          }} 
        />
      </Stack>
    </>
  );
}
