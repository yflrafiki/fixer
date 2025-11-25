import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { Mechanic, ServiceRequest } from '../types';

type CustomerHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CustomerHome'>;

interface Props {
  navigation: CustomerHomeScreenNavigationProp;
}

const CustomerHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, mechanics, addRequest, requests } = useApp();
  const [nearbyMechanics, setNearbyMechanics] = useState<Mechanic[]>([]);

  useEffect(() => {
    // For demo, show all mechanics as nearby
    setNearbyMechanics(mechanics.filter(m => m.isAvailable));
  }, [mechanics]);

  const requestService = (mechanic: Mechanic) => {
    if (!currentUser || currentUser.userType !== 'customer') return;

    const newRequest: ServiceRequest = {
      id: Date.now().toString(),
      customerId: currentUser.id,
      mechanicId: mechanic.id,
      carType: (currentUser as any).carType,
      description: 'Car breakdown assistance needed',
      status: 'pending',
      location: mechanic.location,
      createdAt: new Date(),
    };

    addRequest(newRequest);
    Alert.alert('Success', 'Service request sent to mechanic');
  };

  const myRequests = requests.filter(req => 
    req.customerId === currentUser?.id && req.status !== 'completed'
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Mechanics</Text>
      
      <FlatList
        data={nearbyMechanics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.mechanicCard}>
            <Text style={styles.mechanicName}>{item.fullName}</Text>
            <Text style={styles.services}>{item.services.join(', ')}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            <TouchableOpacity 
              style={styles.requestButton}
              onPress={() => requestService(item)}
            >
              <Text style={styles.requestButtonText}>Request Service</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {myRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>My Active Requests</Text>
          {myRequests.map(request => (
            <TouchableOpacity 
              key={request.id}
              style={styles.requestCard}
              onPress={() => navigation.navigate('Chat', { requestId: request.id })}
            >
              <Text>Status: {request.status}</Text>
              <Text>Tap to chat</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
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
    marginBottom: 20,
    marginTop: 50,
  },
  mechanicCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  services: {
    color: '#666',
    marginBottom: 5,
  },
  phone: {
    color: '#007AFF',
    marginBottom: 10,
  },
  requestButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  requestButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  requestsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});

export default CustomerHomeScreen;