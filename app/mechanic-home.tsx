import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useApp } from '../context/AppContext';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Mechanic, ServiceRequest } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function MechanicHomeScreen() {
  const { currentUser, requests, updateRequest, customers, setCurrentUser } = useApp();
  const params = useLocalSearchParams();
  const [userFromParams, setUserFromParams] = useState<Mechanic | null>(null);

  useEffect(() => {
    if (params.user) {
      try {
        const userData = JSON.parse(params.user as string);
        setUserFromParams(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [params]);

  const displayUser = userFromParams || currentUser;
  const myRequests = requests.filter(req => req.mechanicId === displayUser?.id);
  const pendingRequests = myRequests.filter(req => req.status === 'pending');

  if (!displayUser) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleAccept = (requestId: string) => {
    updateRequest(requestId, { 
      status: 'accepted',
      acceptedAt: new Date()
    });
    Alert.alert('Request Accepted', 'You have accepted the service request');
  };

  const handleReject = (requestId: string) => {
    updateRequest(requestId, { status: 'rejected' });
    Alert.alert('Request Rejected');
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.fullName || 'Customer';
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.clear();
      setCurrentUser(null);
      Alert.alert('Success', 'Storage cleared!');
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => {
    const customer = customers.find(c => c.id === item.customerId);
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.customerName}>{getCustomerName(item.customerId)}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
        
        <Text style={styles.carInfo}>Car: {customer?.carType}</Text>
        <Text style={styles.serviceType}>Service: {item.serviceType}</Text>
        <Text style={styles.urgency}>
          Urgency: <Text style={{ color: item.urgency === 'high' ? '#FF3B30' : '#FF9500' }}>
            {item.urgency}
          </Text>
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
          >
            <Icon name="check" size={20} color="white" />
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Icon name="close" size={20} color="white" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {displayUser.fullName}</Text>
          <Text style={styles.subtitle}>
            {displayUser.isAvailable ? '🟢 Available for work' : '🔴 Not available'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.requestsContainer}>
        <Text style={styles.sectionTitle}>
          Service Requests ({pendingRequests.length})
        </Text>
        
        {pendingRequests.length > 0 ? (
          <FlatList
            data={pendingRequests}
            renderItem={renderRequestCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="assignment" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>
              Customers will send you service requests here
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Debug Button */}
      <TouchableOpacity style={styles.debugButton} onPress={clearStorage}>
        <Text style={styles.debugButtonText}>Clear Storage</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  requestsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  carInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  urgency: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  debugButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});