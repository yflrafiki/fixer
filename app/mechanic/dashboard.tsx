import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import * as Location from 'expo-location';

export default function Dashboard() {
  const router = useRouter();
  const { user, profile } = useAuth(); // Get profile from AuthContext
  const [requests, setRequests] = useState([]);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const [mechanicAddress, setMechanicAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get address from coordinates
  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        return `${address.street || ''} ${address.name || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
      }
      return "Address not available";
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return "Unable to get address";
    }
  };

  // Load mechanic data and requests
  const loadMechanicData = async () => {
    try {
      // Get current location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for this app to work properly.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setMechanicLocation(coords);

      // Get address from coordinates
      const address = await getAddressFromCoords(coords.latitude, coords.longitude);
      setMechanicAddress(address);

      // Update location in database
      await supabase
        .from('profiles')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('id', user.id);

      // Get pending requests for this mechanic with customer details
      await loadRequests();
      
    } catch (error) {
      console.error('Error initializing mechanic:', error);
      Alert.alert('Error', 'Failed to load mechanic data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load requests separately
  const loadRequests = async () => {
    try {
      console.log('Loading requests for mechanic:', user.id);
      
      const { data: requestsData, error } = await supabase
        .from('requests')
        .select(`
          *,
          customer:profiles!customer_id(*)
        `)
        .eq('mechanic_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        return;
      }

      console.log('Found requests:', requestsData);

      // Get addresses for each customer
      const requestsWithAddresses = await Promise.all(
        (requestsData || []).map(async (request) => {
          if (request.customer?.latitude && request.customer?.longitude) {
            const customerAddress = await getAddressFromCoords(
              request.customer.latitude,
              request.customer.longitude
            );
            return {
              ...request,
              customer: {
                ...request.customer,
                address: customerAddress
              }
            };
          }
          return {
            ...request,
            customer: {
              ...request.customer,
              address: "Location not available"
            }
          };
        })
      );

      setRequests(requestsWithAddresses);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadMechanicData();
    }
  }, [user]);

  // Real-time subscription for new requests
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for mechanic:', user.id);

    const subscription = supabase
      .channel('mechanic-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `mechanic_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New request received:', payload);
          
          // Get customer details for the new request
          const { data: customer } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.customer_id)
            .single();

          // Get customer address
          let customerAddress = "Location not available";
          if (customer?.latitude && customer?.longitude) {
            customerAddress = await getAddressFromCoords(
              customer.latitude,
              customer.longitude
            );
          }

          setRequests(prev => [{
            ...payload.new,
            customer: {
              ...customer,
              address: customerAddress
            }
          }, ...prev]);

          // Show notification
          Alert.alert(
            "New Service Request!",
            `You have a new request from ${customer?.full_name}`,
            [
              {
                text: "View",
                onPress: () => router.push(`/mechanic/request?id=${payload.new.id}`)
              },
              { text: "Later", style: "cancel" }
            ]
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `mechanic_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Request updated:', payload);
          // Update the request in the list
          setRequests(prev => 
            prev.map(req => 
              req.id === payload.new.id ? { ...req, ...payload.new } : req
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from real-time updates');
      subscription.unsubscribe();
    };
  }, [user]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1); // Distance in km
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMechanicData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Mechanic Dashboard</Text>
      
      {/* Mechanic Details */}
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <Text style={styles.sectionTitle}>Your Details</Text>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => router.push("/mechanic/profile")}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.detailText}>Name: {profile?.full_name || 'Not set'}</Text>
        <Text style={styles.detailText}>Service: {profile?.service_type || 'Not set'}</Text>
        <Text style={styles.detailText}>Phone: {profile?.phone || 'Not set'}</Text>
        <Text style={styles.detailText}>Email: {user?.email}</Text>
        
        {mechanicAddress ? (
          <Text style={styles.addressText}>📍 {mechanicAddress}</Text>
        ) : (
          <Text style={styles.detailText}>Location: Getting address...</Text>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{requests.length}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {requests.filter(req => req.status === 'accepted').length}
            </Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
        </View>
      </View>

      {/* Incoming Requests */}
      <View style={styles.requestsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Requests</Text>
          <Text style={styles.requestCount}>({requests.length})</Text>
        </View>
        
        {requests.length === 0 ? (
          <View style={styles.noRequests}>
            <Text style={styles.noRequestsText}>No pending requests</Text>
            <Text style={styles.noRequestsSubtext}>
              New requests will appear here when customers send them.
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => router.push(`/mechanic/request?id=${request.id}`)}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>
                  Request #{request.id.slice(0, 8)}
                </Text>
                <Text style={styles.requestTime}>
                  {new Date(request.created_at).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.detailText}>Customer: {request.customer?.full_name}</Text>
              <Text style={styles.detailText}>Car: {request.customer?.car_type}</Text>
              <Text style={styles.detailText}>Phone: {request.customer?.phone}</Text>
              <Text style={styles.addressText}>📍 {request.customer?.address}</Text>
              
              {mechanicLocation && request.customer?.latitude && request.customer?.longitude && (
                <Text style={styles.distance}>
                  📏 {calculateDistance(
                    mechanicLocation.latitude,
                    mechanicLocation.longitude,
                    request.customer.latitude,
                    request.customer.longitude
                  )} km away
                </Text>
              )}
              
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.status,
                  { color: request.status === 'pending' ? '#FFA500' : '#666' }
                ]}>
                  Status: {request.status}
                </Text>
                <Text style={styles.viewDetails}>Tap to respond →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={loadMechanicData}
          >
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push("/mechanic/profile")}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editProfileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editProfileText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  requestsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  requestCount: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestTime: {
    fontSize: 12,
    color: '#666',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  addressText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#007AFF',
    fontWeight: '500',
  },
  distance: {
    color: '#FF6B35',
    fontWeight: 'bold',
    marginTop: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  status: {
    fontStyle: 'italic',
    fontSize: 12,
  },
  viewDetails: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  noRequests: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noRequestsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  noRequestsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
