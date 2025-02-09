// app/layout.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Modal } from 'react-native';
import { Tabs } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import CustomHeader from '../components/CustomHeader';
import SignInForm from '../components/SignInForm';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'map') {
              return (
                <Image
                  source={require('../assets/images/mapicon.png')}
                  style={[styles.tabIcon, { tintColor: color, width: size, height: size }]}
                />
              );
            } else if (route.name === 'groups') {
              return (
                <Image
                  source={require('../assets/images/groupicon.png')}
                  style={[styles.tabIcon, { tintColor: color, width: size, height: size }]}
                />
              );
            } else if (route.name === 'logs') {
              return (
                <Image
                  source={require('../assets/images/logicon.png')}
                  style={[styles.tabIcon, { tintColor: color, width: size, height: size }]}
                />
              );
            } else if (route.name === 'weather') {
              return (
                <Image
                  source={require('../assets/images/weathericon.png')}
                  style={[styles.tabIcon, { tintColor: color, width: size, height: size }]}
                />
              );
            }
          },
          tabBarActiveTintColor: '#2c3e50',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
        <Tabs.Screen name="logs" options={{ title: 'Logs' }} />
        <Tabs.Screen name="weather" options={{ title: 'Weather' }} />
      </Tabs>
      {/* Sign In Modal: If no user is signed in, display the modal */}
      {!user && (
        <Modal visible={true} animationType="slide" transparent={false}>
          <SignInForm />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabIcon: { resizeMode: 'contain' },
});
