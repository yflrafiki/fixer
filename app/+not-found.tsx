import { Link, usePathname, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';

export default function NotFoundScreen() {
  const pathname = usePathname();
  const [clearing, setClearing] = useState(false);
  
  const clearStorage = async () => {
    setClearing(true);
    try {
      await AsyncStorage.clear();
      Alert.alert('Success!', 'Storage cleared. The app will restart.');
      // Force reload by navigating to index
      setTimeout(() => {
        router.replace('/');
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    } finally {
      setClearing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AutoFix - Page Not Found</Text>
      <Text style={styles.subtitle}>The route "{pathname}" doesn't exist.</Text>
      
      <Text style={styles.helpText}>
        It looks like there's stored user data causing auto-redirect issues.
      </Text>

      <TouchableOpacity 
        style={[styles.clearButton, clearing && styles.buttonDisabled]} 
        onPress={clearStorage}
        disabled={clearing}
      >
        <Text style={styles.clearButtonText}>
          {clearing ? 'Clearing...' : 'Clear Storage & Restart App'}
        </Text>
      </TouchableOpacity>

      <View style={styles.debugInfo}>
        <Text style={styles.debugTitle}>Available Routes:</Text>
        <Text style={styles.debugItem}>• / (home)</Text>
        <Text style={styles.debugItem}>• /login</Text>
        <Text style={styles.debugItem}>• /customer-signup</Text>
        <Text style={styles.debugItem}>• /mechanic-signup</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>Try Going Home</Text>
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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF3B30',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    marginBottom: 30,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  debugItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});