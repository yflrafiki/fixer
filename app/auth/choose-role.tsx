import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ChooseRole() {
  const router = useRouter();
  const { user } = useAuth();

  if (user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CarFixer</Text>
      <Text style={styles.subtitle}>How would you like to join us?</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionCard, styles.customerCard]}
          onPress={() => router.push("/auth/signup?role=customer")}
        >
          <Text style={styles.optionIcon}>🚗</Text>
          <Text style={styles.optionTitle}>I need car repair</Text>
          <Text style={styles.optionSubtitle}>Sign up as Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, styles.mechanicCard]}
          onPress={() => router.push("/auth/signup?role=mechanic")}
        >
          <Text style={styles.optionIcon}>🔧</Text>
          <Text style={styles.optionTitle}>I provide repairs</Text>
          <Text style={styles.optionSubtitle}>Sign up as Mechanic</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account?</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionCard: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: "center",
  },
  customerCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  mechanicCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  loginContainer: {
    alignItems: "center",
  },
  loginText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#007AFF",
    minWidth: 150,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});