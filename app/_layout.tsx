import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Error Boundary to catch any JS crash and show it instead of freezing
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={crashStyles.container}>
          <Text style={crashStyles.icon}>!</Text>
          <Text style={crashStyles.title}>App Factory Crashed</Text>
          <Text style={crashStyles.msg}>{this.state.error}</Text>
          <TouchableOpacity
            style={crashStyles.btn}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={crashStyles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const crashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { color: '#EF4444', fontSize: 48, fontWeight: 'bold', marginBottom: 16 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  msg: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn: { backgroundColor: '#A78BFA', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
