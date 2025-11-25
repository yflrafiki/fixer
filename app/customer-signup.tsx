import { router } from 'expo-router';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Location } from '../types';

export default function CustomerSignupScreen() {
  const { addCustomer, setCurrentUser } = useApp();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [carType, setCarType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !phone.trim() || !carType.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      // For demo, using a default location (San Francisco)
      const defaultLocation: Location = {
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'San Francisco, CA'
      };

      const newCustomer: Customer = {
        id: Date.now().toString(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: '', // Optional for now
        carType: carType.trim(),
        location: defaultLocation,
        userType: 'customer',
        paymentMethods: [],
        createdAt: new Date(),
      };

      console.log('Creating new customer:', newCustomer);
      
      // Add to context
      addCustomer(newCustomer);
      setCurrentUser(newCustomer);
      
      console.log('Navigating to customer home...');
      
      // Navigate with user data in params
      router.replace({
        pathname: '/customer-home',
        params: { user: JSON.stringify(newCustomer) }
      });
      
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Customer Sign Up</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number *"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Car Type (e.g., Toyota Camry) *"
        value={carType}
        onChangeText={setCarType}
        autoCapitalize="words"
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 50,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});