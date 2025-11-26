// app/customer/find-mechanics.tsx - This is your existing map screen
import MapView, { Marker } from "react-native-maps";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { supabase } from "../../utils/supabase";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function FindMechanics() {
  const router = useRouter();
  const { user } = useAuth();
  const [region, setRegion] = useState(null);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is needed to find nearby mechanics.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "mechanic")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      setMechanics(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.container}>
        <Text>Unable to load location</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Mechanics Nearby</Text>
        <Text style={styles.subtitle}>
          {mechanics.length} mechanics found in your area
        </Text>
      </View>

      <MapView style={styles.map} region={region}>
        {mechanics.map(m => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            onPress={() =>
              router.push({ 
                pathname: "/customer/mechanic-details", 
                params: { id: m.id } 
              })
            }
            title={m.full_name}
            description={m.service_type}
          />
        ))}
      </MapView>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});