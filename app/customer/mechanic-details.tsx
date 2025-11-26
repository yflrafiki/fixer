import { supabase } from "../../utils/supabase";
import { View, Text, Button, StyleSheet, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import * as Location from 'expo-location';
import MapView, { Marker } from "react-native-maps";

export default function MechanicDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [mechanic, setMechanic] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [mechanicAddress, setMechanicAddress] = useState("");
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get mechanic details
        const { data: mechanicData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        setMechanic(mechanicData);

        // Get mechanic address
        if (mechanicData?.latitude && mechanicData?.longitude) {
          const address = await getAddressFromCoords(
            mechanicData.latitude,
            mechanicData.longitude
          );
          setMechanicAddress(address);
        }

        // Get customer location for distance calculation
        const { data: customerData } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("id", user.id)
          .single();

        if (customerData?.latitude && customerData?.longitude && mechanicData?.latitude && mechanicData?.longitude) {
          setCustomerLocation({
            latitude: customerData.latitude,
            longitude: customerData.longitude,
          });

          const dist = calculateDistance(
            customerData.latitude,
            customerData.longitude,
            mechanicData.latitude,
            mechanicData.longitude
          );
          setDistance(dist);
        }
      } catch (error) {
        console.error('Error loading mechanic details:', error);
        Alert.alert("Error", "Failed to load mechanic details");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const requestService = async () => {
    try {
         console.log('Sending request from customer:', user.id, 'to mechanic:', id);

      const { data, error } = await supabase.from("requests").insert({
        customer_id: user.id,
        mechanic_id: id,
        status: "pending",
      }).select();

      if (error) {
        console.error('Request insertion error:', error);
        throw error;
      }

      console.log('Request created successfully:', data);

      Alert.alert(
        "Request Sent!", 
        "Your service request has been sent to the mechanic. They will respond shortly.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Request error:', error);
      Alert.alert("Error", "Failed to send request. Please try again.");
    }
  };

  if (loading || !mechanic) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const mapRegion = mechanic.latitude && mechanic.longitude ? {
    latitude: mechanic.latitude,
    longitude: mechanic.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mechanic Details</Text>
      
      <View style={styles.detailsCard}>
        <Text style={styles.mechanicName}>{mechanic.full_name}</Text>
        <Text style={styles.serviceType}>Service: {mechanic.service_type}</Text>
        <Text style={styles.phone}>📞 {mechanic.phone}</Text>
        
        {mechanicAddress && (
          <Text style={styles.address}>📍 {mechanicAddress}</Text>
        )}
        
        {distance !== null && (
          <Text style={styles.distance}>
            📏 {distance.toFixed(1)} km from your location
          </Text>
        )}

        <Text style={styles.rating}>
          ⭐️ Rating: {mechanic.rating || "Not rated yet"}
        </Text>
      </View>

      {/* Map View */}
      {mapRegion && (
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <MapView style={styles.map} region={mapRegion}>
            <Marker
              coordinate={{
                latitude: mechanic.latitude,
                longitude: mechanic.longitude,
              }}
              title={mechanic.full_name}
              description={mechanic.service_type}
            />
            {customerLocation && (
              <Marker
                coordinate={customerLocation}
                title="Your Location"
                pinColor="blue"
              />
            )}
          </MapView>
        </View>
      )}

      {/* Request Button */}
      <View style={styles.requestSection}>
        <Text style={styles.requestTitle}>Need Assistance?</Text>
        <Text style={styles.requestDescription}>
          Send a service request to {mechanic.full_name}. They will respond to accept or decline your request.
        </Text>
        <Button 
          title="Request Service" 
          onPress={requestService} 
          color="#007AFF"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  detailsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mechanicName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  serviceType: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  distance: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '500',
  },
  mapSection: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  map: {
    height: 200,
    borderRadius: 10,
  },
  requestSection: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
});