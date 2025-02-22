import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

export default function AuthForm() {
  // Toggle between "Sign In" and "Create Account" modes
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email and password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Only needed for Sign Up mode
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Reset fields when the component mounts
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (isSignUp && password.trim() !== confirmPassword.trim()) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        // Create a new account
        await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        Alert.alert('Success', 'Account created! You are now signed in.');
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      }
      // onAuthStateChanged in your layout will detect the user
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    // Reset fields when switching modes
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
      
      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      {isSignUp && (
        <TextInput
          placeholder="Confirm Password"
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      )}
      
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={toggleMode} style={styles.toggleButton}>
        <Text style={styles.toggleText}>
          {isSignUp
            ? 'Already have an account? Sign In'
            : "Don't have an account? Create one"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff'
  },
  title: { 
    fontSize: 24, 
    marginBottom: 20 
  },
  input: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 5, 
    padding: 10, 
    marginBottom: 15 
  },
  button: { 
    backgroundColor: '#2c3e50', 
    padding: 15, 
    borderRadius: 5, 
    width: '100%', 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  toggleButton: { 
    marginTop: 15 
  },
  toggleText: { 
    color: '#007AFF', 
    fontSize: 16,
  },
});
