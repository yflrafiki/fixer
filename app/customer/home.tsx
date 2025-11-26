// app/customer/home.tsx - Updated main customer dashboard
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import * as Location from 'expo-location';

export default function CustomerHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [customerAddress, setCustomerAddress] = useState("");

  // Function to update customer location
  const updateCustomerLocation = async () => {
    try {
      console.log('📍 Starting location update...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'Please enable location services to help mechanics find you.');
        return false;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log('📍 Customer location captured:', coords);

      // Get address from coordinates
      const address = await getAddressFromCoords(coords.latitude, coords.longitude);
      setCustomerAddress(address);

      // Update customer location in database
      const { error } = await supabase
        .from("profiles")
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq("id", user.id);

      if (error) {
        console.error('❌ Error updating customer location:', error);
        Alert.alert("Error", "Failed to update your location");
        return false;
      } else {
        console.log('✅ Customer location updated successfully');
        
        // Reload profile to get updated location
        const { data: updatedProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setProfile(updatedProfile);
        Alert.alert("Location Updated", `Your location has been updated to: ${address}`);
        return true;
      }
    } catch (error) {
      console.error('💥 Error updating customer location:', error);
      Alert.alert("Error", "Failed to update your location");
      return false;
    }
  };

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

  const loadData = async () => {
    try {
      // Load customer profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // If customer doesn't have location, update it
      if (!profileData?.latitude || !profileData?.longitude) {
        console.log('📍 Customer missing location, updating...');
        await updateCustomerLocation();
      } else {
        // Get address for existing location
        const address = await getAddressFromCoords(
          profileData.latitude,
          profileData.longitude
        );
        setCustomerAddress(address);
      }

      // Load active request
      const { data: requestData } = await supabase
        .from("requests")
        .select(`
          *,
          mechanic:profiles!mechanic_id(*)
        `)
        .eq("customer_id", user.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setActiveRequest(requestData);

      // Load notifications
      const { data: notificationData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setNotifications(notificationData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for request updates
    const requestSubscription = supabase
      .channel('customer-request-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `customer_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Request updated:', payload.new);
          
          // Get updated request with mechanic details
          const { data: updatedRequest } = await supabase
            .from("requests")
            .select(`
              *,
              mechanic:profiles!mechanic_id(*)
            `)
            .eq("id", payload.new.id)
            .single();

          setActiveRequest(updatedRequest);
          
          // Show alert for important status changes
          if (payload.old.status === 'pending' && payload.new.status === 'accepted') {
            Alert.alert(
              "🎉 Request Accepted!",
              `${updatedRequest?.mechanic?.full_name} has accepted your service request and is on the way!`,
              [
                { 
                  text: "View Details", 
                  onPress: () => router.push("/customer/requests") 
                },
                { text: "OK", style: "cancel" }
              ]
            );
          } else if (payload.old.status === 'pending' && payload.new.status === 'rejected') {
            Alert.alert(
              "Request Declined",
              "The mechanic was unable to accept your request. Please try another mechanic.",
              [{ text: "Find Another Mechanic", onPress: () => router.push("/customer/find-mechanics") }]
            );
          } else if (payload.new.mechanic_arrived && !payload.old.mechanic_arrived) {
            Alert.alert(
              "📍 Mechanic Arrived!",
              `${updatedRequest?.mechanic?.full_name} has arrived at your location!`,
              [{ text: "OK" }]
            );
          } else if (payload.new.service_completed && !payload.old.service_completed) {
            Alert.alert(
              "✅ Service Completed!",
              `Service has been completed by ${updatedRequest?.mechanic?.full_name}. Thank you!`,
              [{ text: "OK" }]
            );
          }
        }
      )
      .subscribe();

    // Listen for new notifications
    const notificationSubscription = supabase
      .channel('customer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification:', payload.new);
          setNotifications(prev => [payload.new, ...prev]);
          
          // Show alert for new notifications
          if (payload.new.type === 'arrival') {
            Alert.alert(
              "🎉 Mechanic Arrived!",
              payload.new.message,
              [
                { 
                  text: "View Details", 
                  onPress: () => router.push("/customer/requests") 
                },
                { text: "OK", style: "cancel" }
              ]
            );
          } else if (payload.new.type === 'acceptance') {
            Alert.alert(
              "🚗 Request Accepted!",
              payload.new.message,
              [{ text: "OK" }]
            );
          } else if (payload.new.type === 'rejection') {
            Alert.alert(
              "Request Declined",
              payload.new.message,
              [{ text: "Find Another Mechanic", onPress: () => router.push("/customer/find-mechanics") }]
            );
          } else if (payload.new.type === 'completion') {
            Alert.alert(
              "✅ Service Completed!",
              payload.new.message,
              [{ text: "OK" }]
            );
          }
        }
      )
      .subscribe();

    return () => {
      requestSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusInfo = (request) => {
    if (!request) return { text: 'No active service', color: '#666', icon: '🔍' };
    
    if (request.service_completed) return { text: 'Service Completed', color: 'green', icon: '✅' };
    if (request.mechanic_arrived) return { text: 'Mechanic Arrived', color: 'orange', icon: '📍' };
    if (request.status === 'accepted') return { text: 'Accepted - On the way', color: 'blue', icon: '🚗' };
    if (request.status === 'rejected') return { text: 'Declined', color: 'red', icon: '❌' };
    return { text: 'Pending Approval', color: '#FFC107', icon: '⏳' };
  };

  const statusInfo = getStatusInfo(activeRequest);

  const markNotificationAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Customer Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.customerName}>{profile?.full_name}</Text>
        <Text style={styles.carInfo}>Car: {profile?.car_type}</Text>
        <Text style={styles.phone}>Phone: {profile?.phone}</Text>
        
        {/* Location Status */}
        <View style={styles.locationSection}>
          <Text style={styles.locationTitle}>Your Location:</Text>
          {customerAddress ? (
            <Text style={styles.locationAddress}>📍 {customerAddress}</Text>
          ) : (
            <Text style={styles.locationMissing}>📍 Location not set</Text>
          )}
          <TouchableOpacity 
            style={styles.updateLocationButton}
            onPress={updateCustomerLocation}
          >
            <Text style={styles.updateLocationText}>
              {customerAddress ? 'Update My Location' : 'Set My Location'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>Recent Updates</Text>
          {notifications.slice(0, 3).map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.read && styles.unreadNotification
              ]}
              onPress={() => markNotificationAsRead(notification.id)}
            >
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>
                {new Date(notification.created_at).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
          ))}
          {notifications.length > 3 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push("/customer/requests")}
            >
              <Text style={styles.viewAllText}>View All Updates</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Current Service Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Current Service Status</Text>
        
        {activeRequest ? (
          <View style={styles.requestCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                <Text style={styles.statusText}>{statusInfo.text}</Text>
              </View>
            </View>
            
            <Text style={styles.mechanicName}>
              Mechanic: {activeRequest.mechanic?.full_name || 'Not assigned'}
            </Text>
            <Text style={styles.serviceType}>
              Service: {activeRequest.mechanic?.service_type || 'General repair'}
            </Text>
            <Text style={styles.phone}>📞 {activeRequest.mechanic?.phone || 'Not available'}</Text>
            <Text style={styles.requestTime}>
              Requested: {new Date(activeRequest.created_at).toLocaleString()}
            </Text>
            
            {/* Service Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressStep}>
                <Text style={[
                  styles.progressIcon,
                  activeRequest.status !== 'pending' && styles.completedStep
                ]}>
                  {activeRequest.status !== 'pending' ? '✅' : '1️⃣'}
                </Text>
                <Text style={styles.progressText}>Request Sent</Text>
              </View>
              
              <View style={styles.progressStep}>
                <Text style={[
                  styles.progressIcon,
                  activeRequest.status === 'accepted' && styles.completedStep,
                  activeRequest.mechanic_arrived && styles.completedStep
                ]}>
                  {activeRequest.mechanic_arrived ? '✅' : 
                   activeRequest.status === 'accepted' ? '🚗' : '2️⃣'}
                </Text>
                <Text style={styles.progressText}>
                  {activeRequest.mechanic_arrived ? 'Mechanic Arrived' : 'On the way'}
                </Text>
              </View>
              
              <View style={styles.progressStep}>
                <Text style={[
                  styles.progressIcon,
                  activeRequest.service_completed && styles.completedStep
                ]}>
                  {activeRequest.service_completed ? '✅' : '3️⃣'}
                </Text>
                <Text style={styles.progressText}>Service Completed</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => router.push("/customer/requests")}
            >
              <Text style={styles.detailsButtonText}>
                📋 View Request Details
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noRequest}>
            <Text style={styles.noRequestIcon}>🔧</Text>
            <Text style={styles.noRequestText}>No active service request</Text>
            <Text style={styles.noRequestSubtext}>
              Need assistance? Find a mechanic to get started with your service request.
            </Text>
            
            {/* Location Warning for New Requests */}
            {(!profile?.latitude || !profile?.longitude) && (
              <View style={styles.locationWarning}>
                <Text style={styles.warningText}>⚠️ Please set your location first</Text>
                <Text style={styles.warningSubtext}>
                  Mechanics need your location to find you and confirm arrival
                </Text>
                <TouchableOpacity 
                  style={styles.setLocationButton}
                  onPress={updateCustomerLocation}
                >
                  <Text style={styles.setLocationText}>Set My Location</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={[
                styles.findMechanicButton,
                (!profile?.latitude || !profile?.longitude) && styles.disabledButton
              ]}
              onPress={() => {
                if (!profile?.latitude || !profile?.longitude) {
                  Alert.alert(
                    "Location Required",
                    "Please set your location first so mechanics can find you.",
                    [
                      { text: "Set Location", onPress: updateCustomerLocation },
                      { text: "Cancel", style: "cancel" }
                    ]
                  );
                } else {
                  router.push("/customer/find-mechanics");
                }
              }}
              disabled={!profile?.latitude || !profile?.longitude}
            >
              <Text style={styles.findMechanicButtonText}>
                {(!profile?.latitude || !profile?.longitude) 
                  ? "Set Location First" 
                  : "Find a Mechanic"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (!profile?.latitude || !profile?.longitude) {
                Alert.alert("Location Required", "Please set your location first.");
                updateCustomerLocation();
              } else {
                router.push("/customer/find-mechanics");
              }
            }}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Find Mechanics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push("/customer/requests")}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>My Requests</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={updateCustomerLocation}
          >
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionText}>Update Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={loadData}
          >
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  carInfo: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  locationSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  locationAddress: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 8,
  },
  locationMissing: {
    fontSize: 13,
    color: '#FF6B35',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  updateLocationButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  updateLocationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationsSection: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    margin: 10,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  notificationItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  viewAllButton: {
    padding: 10,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  statusSection: {
    padding: 20,
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  serviceType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  progressSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
  },
  completedStep: {
    color: 'green',
  },
  progressText: {
    fontSize: 13,
    color: '#666',
  },
  detailsButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noRequest: {
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
  noRequestIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noRequestText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  noRequestSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  locationWarning: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 10,
  },
  setLocationButton: {
    backgroundColor: '#ffc107',
    padding: 8,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  setLocationText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  findMechanicButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  findMechanicButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 20,
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
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});