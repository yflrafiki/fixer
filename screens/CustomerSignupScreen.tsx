import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';

type CustomerSignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CustomerSignup'>;

interface Props {
  navigation: CustomerSignupScreenNavigationProp;
}

const CustomerSignupScreen: React.FC<Props> = ({ navigation }) => {
  const { addCustomer, setCurrentUser } = useApp();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [carType, setCarType] = useState('');

  const handleSignup = () => {
    if (!fullName || !phone || !carType) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      fullName,
      phone,
      carType,
      userType: 'customer',
    };

    addCustomer(newCustomer);
    setCurrentUser(newCustomer);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Customer Sign Up</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Car Type (e.g., Toyota Camry)"
        value={carType}
        onChangeText={setCarType}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

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
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomerSignupScreen;