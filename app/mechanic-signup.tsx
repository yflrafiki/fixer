import { router } from 'expo-router';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mechanic } from '../types';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

export default function MechanicSignupScreen() {
  const { addMechanic, setCurrentUser } = useApp();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState('');
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need location access to serve customers');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      let address = await Location.reverseGeocodeAsync({ latitude, longitude });
      const firstAddress = address[0];
      
      const userLocation: Location = {
        latitude,
        longitude,
        address: `${firstAddress?.street}, ${firstAddress?.city}, ${firstAddress?.region}`
      };
      
      setLocation(userLocation);
      Alert.alert('Location Found', 'Your workshop location has been set');
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !phone.trim() || !services.trim() || !location) {
      Alert.alert('Error', 'Please fill all required fields and set your location');
      return;
    }

    setLoading(true);

    try {
      const newMechanic: Mechanic = {
        id: Date.now().toString(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: '', // Optional
        services: services.split(',').map(s => s.trim()),
        location: location,
        profilePicture: profilePicture || undefined,
        isAvailable: true,
        rating: 0,
        reviews: [],
        experience: parseInt(experience) || 0,
        hourlyRate: parseInt(hourlyRate) || 0,
        totalJobs: 0,
        specialization: [],
        verificationStatus: 'pending',
        userType: 'mechanic',
        createdAt: new Date(),
      };

      addMechanic(newMechanic);
      setCurrentUser(newMechanic);
      
      router.replace({
        pathname: '/mechanic-home',
        params: { user: JSON.stringify(newMechanic) }
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mechanic Sign Up</Text>
      
      {/* Profile Picture */}
      <View style={styles.photoSection}>
        <Text style={styles.sectionTitle}>Profile Picture</Text>
        <View style={styles.photoContainer}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          <Text style={styles.photoButtonText}>Choose Profile Picture</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Full Name *"
        value={fullName}
        onChangeText={setFullName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone Number *"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Services (comma separated) *"
        value={services}
        onChangeText={setServices}
        placeholderTextColor="#999"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Years of Experience"
        value={experience}
        onChangeText={setExperience}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Hourly Rate ($)"
        value={hourlyRate}
        onChangeText={setHourlyRate}
        keyboardType="numeric"
      />

      {/* Location */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Your Workshop Location *</Text>
        <TouchableOpacity 
          style={[styles.locationButton, gettingLocation && styles.buttonDisabled]} 
          onPress={getLocation}
          disabled={gettingLocation}
        >
          <Text style={styles.locationButtonText}>
            {gettingLocation ? 'Getting Location...' : 'Set Workshop Location'}
          </Text>
        </TouchableOpacity>
        {location && (
          <Text style={styles.locationText}>
            📍 {location.address}
          </Text>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.button, (!location || loading) && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={!location || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Become a Mechanic'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
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
    marginBottom: 30,
    marginTop: 50,
    textAlign: 'center',
  },
  photoSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
  },
  photoButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  photoButtonText: {
    color: 'white',
    fontSize: 14,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  locationSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  locationButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});