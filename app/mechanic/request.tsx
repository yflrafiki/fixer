import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { useAuth } from "../../context/AuthContext";
import * as Location from 'expo-location';

export default function Request() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [customerAddress, setCustomerAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAtLocation, setIsAtLocation] = useState(false);

  useEffect(() => {
    const loadRequestDetails = async () => {
      try {
        const { data: requestData, error } = await supabase
          .from("requests")
          .select(`
            *,
            customer:profiles!customer_id(*),
            mechanic:profiles!mechanic_id(*)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        setRequest(requestData);
        setCustomer(requestData.customer);
        setMechanic(requestData.mechanic);

        if (requestData.customer?.latitude && requestData.customer?.longitude) {
          const address = await getAddressFromCoords(
            requestData.customer.latitude,
            requestData.customer.longitude
          );
          setCustomerAddress(address);
        }
      } catch (error) {
        console.error('Error loading request details:', error);
        Alert.alert("Error", "Failed to load request details");
      } finally {
        setLoading(false);
      }
    };

    loadRequestDetails();
  }, [id]);

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
      return "Unable to get address";
    }
  };

  // Check if mechanic is at customer's location
  const checkIfAtLocation = async () => {
  try {
    console.log('📍 Starting location check...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('📍 Location permission status:', status);
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed to confirm arrival.');
      return false;
    }

    console.log('📍 Getting current position...');
    const location = await Location.getCurrentPositionAsync({});
    console.log('📍 Mechanic location:', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    const mechanicCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };

    console.log('📍 Customer location:', {
      latitude: customer?.latitude,
      longitude: customer?.longitude
    });

    if (customer?.latitude && customer?.longitude) {
      const distance = calculateDistance(
        mechanicCoords.latitude,
        mechanicCoords.longitude,
        customer.latitude,
        customer.longitude
      );

      console.log('📍 Distance to customer:', distance, 'km', '(', (distance * 1000).toFixed(0), 'meters )');

      // If within 100 meters, consider at location
      if (distance <= 0.1) { // 0.1 km = 100 meters
        console.log('📍 Within 100 meters - at location!');
        setIsAtLocation(true);
        return true;
      } else {
        const distanceMeters = (distance * 1000).toFixed(0);
        console.log('📍 Too far away:', distanceMeters, 'meters');
        Alert.alert(
          "Not at Location", 
          `You are ${distanceMeters} meters away from the customer's location. Please get closer to confirm arrival.`
        );
        return false;
      }
    } else {
      console.log('❌ Customer location not available');
      Alert.alert("Error", "Customer location is not available.");
      return false;
    }
  } catch (error) {
    console.error('💥 Error checking location:', error);
    Alert.alert("Error", "Failed to check your location: " + error.message);
    return false;
  }
};

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const sendArrivalNotification = async () => {
  try {
    console.log('🔍 Sending arrival notification for request:', id);
    console.log('📱 Customer ID:', customer?.id);
    console.log('👤 Mechanic Name:', mechanic?.full_name);

    // First check if mechanic is at location
    console.log('📍 Checking location...');
    const isAtCustomerLocation = await checkIfAtLocation();
    console.log('📍 Location check result:', isAtCustomerLocation);
    
    if (!isAtCustomerLocation) {
      console.log('❌ Not at customer location, stopping arrival notification');
      return;
    }

    console.log('✅ At customer location, updating request...');
    
    // Update request status to mark mechanic as arrived
    const { data: updateData, error: updateError } = await supabase
      .from("requests")
      .update({ 
        mechanic_arrived: true 
      })
      .eq("id", id)
      .select(); // Add select to see what was updated

    if (updateError) {
      console.error('❌ Error updating request:', updateError);
      throw updateError;
    }

    console.log('✅ Request updated - mechanic arrived:', updateData);

    // Send notification to customer
    console.log('📨 Sending notification to customer...');
    const notificationData = {
      user_id: customer.id,
      title: "Mechanic Arrived! 🎉",
      message: `${mechanic?.full_name} has arrived at your location and is ready to assist you.`,
      type: "arrival",
      request_id: id
    };

    console.log('📧 Notification payload:', notificationData);

    const { data: notificationResult, error: notificationError } = await supabase
      .from("notifications")
      .insert(notificationData)
      .select();

    if (notificationError) {
      console.error('❌ Error sending notification:', notificationError);
      throw notificationError;
    }

    console.log('✅ Arrival notification sent to customer:', notificationResult);

    Alert.alert(
      "Arrival Confirmed! ✅", 
      "The customer has been notified that you have arrived at their location.",
      [{ text: "OK" }]
    );

  } catch (error) {
    console.error('💥 Error in sendArrivalNotification:', error);
    Alert.alert("Error", "Failed to confirm arrival: " + error.message);
  }
};

  const acceptRequest = async () => {
    try {
      console.log('Accepting request:', id);
      
      // Update request status
      const { error: updateError } = await supabase
        .from("requests")
        .update({ 
          status: "accepted" 
        })
        .eq("id", id);

      if (updateError) throw updateError;

      console.log('Request status updated to accepted');

      // Send acceptance notification to customer
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: customer.id,
          title: "Request Accepted! 🚗",
          message: `${mechanic?.full_name} has accepted your service request and is on the way to your location!`,
          type: "acceptance",
          request_id: id
        });

      if (notificationError) throw notificationError;

      console.log('Acceptance notification sent');

      Alert.alert(
        "Request Accepted", 
        "Customer has been notified that you're on the way.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert("Error", "Failed to accept request: " + error.message);
    }
  };

  const declineRequest = async () => {
    try {
      console.log('Declining request:', id);
      
      // Update request status
      const { error: updateError } = await supabase
        .from("requests")
        .update({ 
          status: "rejected" 
        })
        .eq("id", id);

      if (updateError) throw updateError;

      console.log('Request status updated to rejected');

      // Send rejection notification to customer
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: customer.id,
          title: "Request Declined",
          message: `${mechanic?.full_name} is unable to accept your service request at this time.`,
          type: "rejection",
          request_id: id
        });

      if (notificationError) throw notificationError;

      console.log('Rejection notification sent');

      Alert.alert("Request Declined", "Customer has been notified.");
      router.back();
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert("Error", "Failed to decline request: " + error.message);
    }
  };

  const completeService = async () => {
    try {
      const { error: updateError } = await supabase
        .from("requests")
        .update({ 
          service_completed: true,
          status: "completed"
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Send completion notification to customer
      await supabase
        .from("notifications")
        .insert({
          user_id: customer.id,
          title: "Service Completed! ✅",
          message: `Service has been completed by ${mechanic?.full_name}. Thank you for using our service!`,
          type: "completion",
          request_id: id
        });

      Alert.alert(
        "Service Completed", 
        "Thank you for providing the service! Customer has been notified.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to mark service as completed");
    }
  };

  if (loading || !request || !customer) {
    return (
      <View style={styles.container}>
        <Text>Loading request details...</Text>
      </View>
    );
  }

  const mapRegion = customer.latitude && customer.longitude ? {
    latitude: customer.latitude,
    longitude: customer.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Request</Text>
      
      <View style={styles.detailsCard}>
        <Text style={styles.customerName}>{customer.full_name}</Text>
        <Text style={styles.detailText}>Car: {customer.car_type}</Text>
        <Text style={styles.detailText}>Phone: {customer.phone}</Text>
        <Text style={styles.addressText}>📍 {customerAddress}</Text>
        <Text style={styles.statusText}>Status: {request.status}</Text>
        
        {request.mechanic_arrived && (
          <Text style={styles.arrivedText}>✅ You have arrived at location</Text>
        )}
        
        {request.service_completed && (
          <Text style={styles.completedText}>✅ Service completed</Text>
        )}
      </View>

      {mapRegion && (
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Customer Location</Text>
          <MapView style={styles.map} region={mapRegion}>
            <Marker
              coordinate={{
                latitude: customer.latitude,
                longitude: customer.longitude,
              }}
              title="Customer Location"
              description={customer.full_name}
              pinColor="red"
            />
          </MapView>
          <Text style={styles.mapHint}>
            💡 Get within 100 meters of the customer to confirm arrival
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {request.status === 'pending' && (
          <>
            <Button title="Accept Request" onPress={acceptRequest} color="green" />
            <View style={styles.buttonSpacer} />
            <Button title="Decline Request" onPress={declineRequest} color="red" />
          </>
        )}

        {request.status === 'accepted' && !request.mechanic_arrived && (
          <Button 
            title="Confirm Arrival at Location" 
            onPress={sendArrivalNotification} 
            color="orange" 
          />
        )}

        {request.mechanic_arrived && !request.service_completed && (
          <Button 
            title="Mark Service as Completed" 
            onPress={completeService} 
            color="blue" 
          />
        )}
      </View>
    </View>
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
  },
  detailsCard: {
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
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  arrivedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 5,
  },
  completedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'blue',
    marginTop: 5,
  },
  mapSection: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  map: {
    flex: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  mapHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  buttonSpacer: {
    width: 10,
  },
});