import { useLocalSearchParams, useRouter } from "expo-router";
import { View, TextInput, Button, Image, Text, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { supabase } from "../../utils/supabase";
import * as FileSystem from 'expo-file-system';

export default function Signup() {
  const { role } = useLocalSearchParams();
  const router = useRouter();

  const [full_name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [carType, setCarType] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const choosePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!res.canceled) setImage(res.assets[0].uri);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string, fileName: string) => {
    try {
      // Method 1: Using FileSystem to read as base64 (most reliable)
      console.log('Reading image file...');
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to array buffer
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      console.log('Uploading to Supabase storage...');
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.log('Upload error details:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      console.log('Upload successful, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const signup = async () => {
    // Basic validation
    if (!full_name || !phone || !email || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (role === "customer" && !carType) {
      Alert.alert("Error", "Please enter your car type");
      return;
    }

    if (role === "mechanic" && !serviceType) {
      Alert.alert("Error", "Please enter your service type");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    
    try {
    // Get customer location first
    let customerLatitude = null;
    let customerLongitude = null;
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        customerLatitude = location.coords.latitude;
        customerLongitude = location.coords.longitude;
        console.log('📍 Customer location captured:', { customerLatitude, customerLongitude });
      }
    } catch (locationError) {
      console.log('⚠️ Could not get customer location during signup:', locationError);
      // Continue without location - it's not critical for signup
    }

    // Sign up with email and password
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          phone: phone,
          full_name: full_name,
          role: role
        }
      }
    });

    if (signUpError || !data.user) {
      alert("Signup failed");
      return;
    }

    let avatarUrl = "";

    // Upload profile picture if selected
    if (image) {
      try {
        const fileName = `avatar_${data.user.id}_${Date.now()}.jpg`;
        avatarUrl = await uploadImage(image, fileName);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        alert("Profile picture upload failed, but account was created.");
      }
    }

    // Create profile in the database - INCLUDING LOCATION
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      role,
      full_name: full_name.trim(),
      phone: phone.trim(),
      avatar_url: avatarUrl,
      car_type: role === "customer" ? carType.trim() : null,
      service_type: role === "mechanic" ? serviceType.trim() : null,
      latitude: customerLatitude, // Save customer location
      longitude: customerLongitude, // Save customer location
    });

    if (profileError) {
      console.error('Profile error:', profileError);
      alert("Failed to save profile");
      return;
    }

    alert("Account created successfully!");
    
    if (role === "customer") {
      router.replace("/customer/home");
    } else {
      router.replace("/mechanic/dashboard");
    }
    
  } catch (error: any) {
    console.error("Signup error:", error);
    alert("An unexpected error occurred");
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={{ padding: 20, marginTop: 50, flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        Sign up as {role}
      </Text>

      <TextInput 
        placeholder="Full Name *" 
        onChangeText={setName}
        value={full_name}
        style={{ borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ddd' }}
        editable={!loading}
      />
      
      <TextInput 
        placeholder="Phone Number *" 
        onChangeText={setPhone}
        value={phone}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ddd' }}
        editable={!loading}
      />
      
      <TextInput 
        placeholder="Email *" 
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ddd' }}
        editable={!loading}
      />
      
      <TextInput 
        placeholder="Password * (min. 6 characters)" 
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ddd' }}
        editable={!loading}
      />

      {role === "customer" && (
        <TextInput 
          placeholder="Car Type *" 
          onChangeText={setCarType}
          value={carType}
          style={{ borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ddd' }}
          editable={!loading}
        />
      )}

      {role === "mechanic" && (
        <TextInput 
          placeholder="Service Type *" 
          onChangeText={setServiceType}
          value={serviceType}
          style={{ borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, borderColor: '#ddd' }}
          editable={!loading}
        />
      )}

      <TouchableOpacity 
        onPress={choosePhoto}
        disabled={loading}
        style={{ 
          backgroundColor: loading ? '#ccc' : '#f0f0f0', 
          padding: 15, 
          borderRadius: 8, 
          marginBottom: 12,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: loading ? '#666' : '#000' }}>
          {loading ? "Uploading..." : "Pick Profile Photo"}
        </Text>
      </TouchableOpacity>
      
      {image && (
        <Image 
          source={{ uri: image }} 
          style={{ 
            height: 120, 
            width: 120, 
            borderRadius: 60, 
            marginVertical: 10,
            alignSelf: 'center'
          }} 
        />
      )}

      <TouchableOpacity 
        onPress={signup}
        disabled={loading}
        style={{ 
          backgroundColor: loading ? '#ccc' : '#007AFF', 
          padding: 15, 
          borderRadius: 8,
          alignItems: 'center',
          marginTop: 10
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          {loading ? "Creating Account..." : "Create Account"}
        </Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 15, fontSize: 12, color: '#666', textAlign: 'center' }}>
        * Required fields
      </Text>
    </View>
  );
}