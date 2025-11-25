import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';

type MechanicHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MechanicHome'>;

interface Props {
  navigation: MechanicHomeScreenNavigationProp;
}

const MechanicHomeScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, requests, updateRequest, customers } = useApp();

  const myRequests = requests.filter(req => 
    req.mechanicId === currentUser?.id && req.status !== 'completed'
  );

  const handleAccept = (requestId: string) => {
    updateRequest(requestId, { status: 'accepted' });
    Alert.alert('Request Accepted', 'You can now chat with the customer');
  };

  const handleReject = (requestId: string) => {
    updateRequest(requestId, { status: 'rejected' });
    Alert.alert('Request Rejected');
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.fullName || 'Unknown Customer';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Requests</Text>
      
      {myRequests.length === 0 ? (
        <Text style={styles.noRequests}>No pending requests</Text>
      ) : (
        <FlatList
          data={myRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <Text style={styles.customerName}>{getCustomerName(item.customerId)}</Text>
              <Text>Car: {item.carType}</Text>
              <Text>Status: {item.status}</Text>
              
              {item.status === 'pending' && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => handleAccept(item.id)}
                  >
                    <Text style={styles.buttonText}>Accept</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => handleReject(item.id)}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {item.status === 'accepted' && (
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={() => navigation.navigate('Chat', { requestId: item.id })}
                >
                  <Text style={styles.chatButtonText}>Chat with Customer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
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
  noRequests: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
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
  },
  chatButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  chatButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default MechanicHomeScreen;