import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Link, router } from 'expo-router'
import React from 'react'

const login = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AutoFixer</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/customer-signup')}>
        <Text style={styles.buttonText}>I'm a Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.mechanicButton]} onPress={() => router.push('/mechanic-signup')}>
        <Text style={styles.buttonText}>I'm a Mechanic</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to AutoFix? </Text>
        <Link href="/" style={styles.link}>Learn More</Link>
      </View>


    </View>
  )
}

export default login

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title:{
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
    fontSize: 16,
    marginBottom: 50,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  mechanicButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  link: {
    color: '#007AFF',
    fontWeight: '600',
  },
})