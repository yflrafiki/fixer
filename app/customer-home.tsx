import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Dimensions } from 'react-native';
import { useApp } from '../context/AppContext';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Customer, Mechanic, ServiceRequest } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

export default function CustomerHomeScreen() {
  const { currentUser, mechanics, addRequest, requests, setCurrentUser } = useApp();
  const params = useLocalSearchParams();
  const [userFromParams, setUserFromParams] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'requests'>('map');
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

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
  const myRequests = requests.filter(req => req.customerId === displayUser?.id);

  if (!displayUser) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const requestService = (mechanic: Mechanic) => {
    const newRequest: ServiceRequest = {
      id: Date.now().toString(),
      customerId: displayUser.id,
      mechanicId: mechanic.id,
      carType: displayUser.carType,
      description: 'Car breakdown assistance needed',
      status: 'pending',
      location: displayUser.location,
      createdAt: new Date(),
      serviceType: 'Breakdown Assistance',
      urgency: 'medium',
      paymentStatus: 'pending',
    };

    addRequest(newRequest);
    Alert.alert('Success', `Service request sent to ${mechanic.fullName}`);
    setSelectedMechanic(null);
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

  // Calculate distance between user and mechanic
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const renderMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: displayUser.location.latitude,
          longitude: displayUser.location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
      >
        {/* User Location */}
        <Marker
          coordinate={{
            latitude: displayUser.location.latitude,
            longitude: displayUser.location.longitude,
          }}
          title="Your Location"
          description="You are here"
        >
          <View style={styles.userMarker}>
            <Icon name="person-pin" size={30} color="#007AFF" />
          </View>
        </Marker>

        {/* Mechanics */}
        {mechanics.filter(m => m.isAvailable).map((mechanic) => (
          <Marker
            key={mechanic.id}
            coordinate={{
              latitude: mechanic.location.latitude,
              longitude: mechanic.location.longitude,
            }}
            title={mechanic.fullName}
            description={mechanic.services.join(', ')}
            onPress={() => setSelectedMechanic(mechanic)}
          >
            <View style={styles.mechanicMarker}>
              <Icon name="build" size={24} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Selected Mechanic Info */}
      {selectedMechanic && (
        <View style={styles.selectedMechanicCard}>
          <Text style={styles.mechanicName}>{selectedMechanic.fullName}</Text>
          <Text style={styles.services}>{selectedMechanic.services.join(' • ')}</Text>
          <Text style={styles.distance}>
            {calculateDistance(
              displayUser.location.latitude,
              displayUser.location.longitude,
              selectedMechanic.location.latitude,
              selectedMechanic.location.longitude
            )} km away
          </Text>
          <Text style={styles.rating}>⭐ {selectedMechanic.rating.toFixed(1)}</Text>
          
          <TouchableOpacity 
            style={styles.requestButton}
            onPress={() => requestService(selectedMechanic)}
          >
            <Icon name="build" size={20} color="white" />
            <Text style={styles.requestButtonText}>Request Service</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedMechanic(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMechanicList = () => (
    <FlatList
      data={mechanics.filter(m => m.isAvailable)}
      renderItem={({ item }) => {
        const distance = calculateDistance(
          displayUser.location.latitude,
          displayUser.location.longitude,
          item.location.latitude,
          item.location.longitude
        );

        return (
          <View style={styles.mechanicCard}>
            <View style={styles.mechanicHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.fullName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.mechanicInfo}>
                <Text style={styles.mechanicName}>{item.fullName}</Text>
                <View style={styles.rating}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              </View>
              <Text style={styles.distance}>{distance} km</Text>
            </View>

            <Text style={styles.services}>{item.services.join(' • ')}</Text>
            <Text style={styles.experience}>
              {item.experience} years experience • ${item.hourlyRate}/hr
            </Text>

            <TouchableOpacity 
              style={styles.requestButton}
              onPress={() => requestService(item)}
            >
              <Icon name="build" size={20} color="white" />
              <Text style={styles.requestButtonText}>Request Service</Text>
            </TouchableOpacity>
          </View>
        );
      }}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
    />
  );

  const renderRequests = () => (
    <FlatList
      data={myRequests}
      renderItem={({ item }) => {
        const mechanic = mechanics.find(m => m.id === item.mechanicId);
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'accepted': return '#34C759';
            case 'pending': return '#FF9500';
            case 'rejected': return '#FF3B30';
            default: return '#8E8E93';
          }
        };

        return (
          <TouchableOpacity 
            style={styles.requestCard}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={styles.requestHeader}>
              <Text style={styles.mechanicName}>{mechanic?.fullName || 'Mechanic'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.serviceType}>{item.serviceType}</Text>
            <Text style={styles.requestDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.chatPrompt}>
              {item.status === 'accepted' ? 'Tap to chat with mechanic →' : 'Waiting for mechanic to accept'}
            </Text>
          </TouchableOpacity>
        );
      }}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hello, {displayUser.fullName}</Text>
          <Text style={styles.subtitle}>Need help with your {displayUser.carType}?</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Icon name="map" size={20} color={activeTab === 'map' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Icon name="list" size={20} color={activeTab === 'list' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>Mechanics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Icon name="assignment" size={20} color={activeTab === 'requests' ? '#007AFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({myRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'map' && renderMap()}
      {activeTab === 'list' && renderMechanicList()}
      {activeTab === 'requests' && renderRequests()}

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
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 5,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    alignItems: 'center',
  },
  mechanicMarker: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  selectedMechanicCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  listContent: {
    padding: 20,
  },
  mechanicCard: {
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
  mechanicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  distance: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  services: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  experience: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  requestButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#666',
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  chatPrompt: {
    fontSize: 12,
    color: '#007AFF',
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