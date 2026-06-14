import React from 'react';
import { Tabs } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { View, useColorScheme } from 'react-native';
import { AudioProvider } from '@/context/AudioContext';
import MiniPlayer from '@/components/MiniPlayer';
import { Home, Search, Library } from 'lucide-react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AudioProvider>
      <ThemeProvider value={DarkTheme}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#121212',
                borderTopColor: 'rgba(255, 255, 255, 0.08)',
                height: 64,
                paddingBottom: 10,
                paddingTop: 8,
              },
              tabBarActiveTintColor: '#1db954',
              tabBarInactiveTintColor: '#b3b3b3',
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '500',
              }
            }}
          >
            <Tabs.Screen 
              name="index" 
              options={{ 
                title: 'Home',
                tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} />
              }} 
            />
            <Tabs.Screen 
              name="search" 
              options={{ 
                title: 'Search',
                tabBarIcon: ({ color, size }) => <Search color={color} size={size - 2} />
              }} 
            />
            <Tabs.Screen 
              name="library" 
              options={{ 
                title: 'Your Library',
                tabBarIcon: ({ color, size }) => <Library color={color} size={size - 2} />
              }} 
            />
          </Tabs>
          
          {/* Floating Player persists on top of all tab views */}
          <MiniPlayer />
        </View>
      </ThemeProvider>
    </AudioProvider>
  );
}
