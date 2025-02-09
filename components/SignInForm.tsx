// app/components/SignInForm.tsx
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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset fields when the component mounts.
  useEffect(() => {
    setEmail('');
    setPassword('');
    setLoading(false);
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The global auth listener in layout.tsx will detect the sign in
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
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
      <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
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
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, marginBottom: 20 },
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
});
