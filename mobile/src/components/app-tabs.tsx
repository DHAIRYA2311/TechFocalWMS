import { Tabs } from 'expo-router';
import React from 'react';

export default function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen 
        name="attendance" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="staffs" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="jobs" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="purchase-orders" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="machines" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="challans" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="expenses" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen 
        name="inventory" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' }
        }} 
      />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
    </Tabs>
  );
}
