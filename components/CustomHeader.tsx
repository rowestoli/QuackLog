// app/components/CustomHeader.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

export default function CustomHeader() {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hide the profile dropdown when the route changes
  useEffect(() => {
    setShowProfileDropdown(false);
  }, [pathname]);

  const handleProfilePress = () => {
    setShowProfileDropdown((prev) => !prev);
  };

  const handleSignOut = async () => {
    try {
      console.log("Attempting to sign out...");
      await signOut(auth);
      console.log("Sign out successful. Resetting navigation to /signin...");
      setShowProfileDropdown(false);
      // Clear navigation history and navigate to the Sign In screen
      router.resetRoot({ pathname: '/signin' });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.headerContainer}>
        {/* Left: Gear Icon */}
        <TouchableOpacity style={styles.iconButton} onPress={() => console.log('Gear pressed')}>
          <Image source={require('../assets/images/gearicon.png')} style={styles.headerIcon} />
        </TouchableOpacity>
        {/* Center: App Title */}
        <Text style={styles.headerTitle}>Duck Hunting App</Text>
        {/* Right: Profile Icon */}
        <TouchableOpacity style={styles.iconButton} onPress={handleProfilePress}>
          <Image source={require('../assets/images/profileicon.png')} style={styles.headerIcon} />
        </TouchableOpacity>
      </View>
      {showProfileDropdown && (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}>
            <Text style={styles.dropdownItemText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fff' },
  headerContainer: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  iconButton: { padding: 8 },
  headerIcon: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    position: 'absolute',
    right: 16,
    top: 60,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dropdownItem: { padding: 10 },
  dropdownItemText: { fontSize: 16, color: '#2c3e50' },
});
