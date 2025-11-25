import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer, Mechanic, ServiceRequest, Message, Review } from '../types';

interface AppContextType {
  customers: Customer[];
  mechanics: Mechanic[];
  requests: ServiceRequest[];
  messages: Message[];
  reviews: Review[];
  currentUser: Customer | Mechanic | null;
  setCurrentUser: (user: Customer | Mechanic | null) => void;
  addCustomer: (customer: Customer) => void;
  addMechanic: (mechanic: Mechanic) => void;
  addRequest: (request: ServiceRequest) => void;
  updateRequest: (requestId: string, updates: Partial<ServiceRequest>) => void;
  addMessage: (message: Message) => void;
  addReview: (review: Review) => void;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<Customer | Mechanic | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from storage on app start
  useEffect(() => {
    loadDataFromStorage();
  }, []);

  const loadDataFromStorage = async () => {
    try {
      console.log('Loading data from storage...');
      
      // Load current user
      const storedUser = await AsyncStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('Loaded current user from storage:', userData);
        setCurrentUser(userData);
      }

      // Load customers
      const storedCustomers = await AsyncStorage.getItem('customers');
      if (storedCustomers) {
        const customersData = JSON.parse(storedCustomers);
        console.log('Loaded customers from storage:', customersData.length);
        setCustomers(customersData);
      }

      // Load demo mechanics
      const demoMechanics: Mechanic[] = [
        {
          id: 'm1',
          fullName: 'John Mechanic',
          phone: '+1234567890',
          email: 'john@example.com',
          services: ['Engine Repair', 'Brake Service', 'Oil Change'],
          location: { latitude: 37.7749, longitude: -122.4194 },
          isAvailable: true,
          rating: 4.8,
          reviews: [],
          experience: 5,
          hourlyRate: 75,
          totalJobs: 127,
          specialization: ['German Cars', 'Japanese Cars'],
          verificationStatus: 'verified',
          userType: 'mechanic',
          createdAt: new Date(),
        },
        {
          id: 'm2',
          fullName: 'Sarah Technician',
          phone: '+1234567891',
          email: 'sarah@example.com',
          services: ['Tire Service', 'AC Repair', 'Electrical'],
          location: { latitude: 37.7849, longitude: -122.4094 },
          isAvailable: true,
          rating: 4.9,
          reviews: [],
          experience: 8,
          hourlyRate: 85,
          totalJobs: 203,
          specialization: ['Electrical Systems', 'AC Systems'],
          verificationStatus: 'verified',
          userType: 'mechanic',
          createdAt: new Date(),
        },
      ];

      setMechanics(demoMechanics);
      setIsInitialized(true);
      console.log('App context initialized successfully');
      
    } catch (error) {
      console.error('Error loading data from storage:', error);
      setIsInitialized(true);
    }
  };

  const addCustomer = (customer: Customer) => {
    console.log('Adding customer:', customer);
    setCustomers(prev => {
      const newCustomers = [...prev, customer];
      console.log('Customers after add:', newCustomers.length);
      return newCustomers;
    });
  };

  const addMechanic = (mechanic: Mechanic) => {
    console.log('Adding mechanic:', mechanic);
    setMechanics(prev => [...prev, mechanic]);
  };

  const addRequest = (request: ServiceRequest) => {
    setRequests(prev => [...prev, request]);
  };

  const updateRequest = (requestId: string, updates: Partial<ServiceRequest>) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, ...updates } : req
    ));
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const addReview = (review: Review) => {
    setReviews(prev => [...prev, review]);
  };

  return (
    <AppContext.Provider value={{
      customers,
      mechanics,
      requests,
      messages,
      reviews,
      currentUser,
      setCurrentUser,
      addCustomer,
      addMechanic,
      addRequest,
      updateRequest,
      addMessage,
      addReview,
      isInitialized,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};