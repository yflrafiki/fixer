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
  refreshMechanics: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUserState] = useState<Customer | Mechanic | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ---------------------------------------------------------
  // 🚀 STARTUP LOAD
  // ---------------------------------------------------------
  useEffect(() => {
    loadAllData();
  }, []);

  // ---------------------------------------------------------
  // 🛠 MECHANIC DATA SANITY CHECKER
  // ---------------------------------------------------------
  const fixMechanicData = (data: any[]): Mechanic[] => {
    console.log("🛠 Checking mechanic storage integrity...");

    if (!data || data.length === 0) return [];

    if (typeof data[0] === "string") {
      console.log("⚠️ OLD INVALID STRING MECHANIC ARRAY FOUND — clearing...");
      return [];
    }

    console.log("✅ Mechanics are valid.");
    return data as Mechanic[];
  };

  // ---------------------------------------------------------
  // 📥 LOAD ALL DATA
  // ---------------------------------------------------------
  const loadAllData = async () => {
    try {
      console.log("🔧 Loading app data...");

      const storedUser = await AsyncStorage.getItem("currentUser");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUserState(user);
        console.log("👤 Current user loaded:", user.fullName);
      }

      const storedCustomers = await AsyncStorage.getItem("customers");
      if (storedCustomers) {
        const list = JSON.parse(storedCustomers);
        setCustomers(list);
        console.log("👥 Customers loaded:", list.length);
      }

      await loadMechanicsFromStorage();

      const storedRequests = await AsyncStorage.getItem("requests");
      if (storedRequests) setRequests(JSON.parse(storedRequests));

      const storedMessages = await AsyncStorage.getItem("messages");
      if (storedMessages) setMessages(JSON.parse(storedMessages));

      const storedReviews = await AsyncStorage.getItem("reviews");
      if (storedReviews) setReviews(JSON.parse(storedReviews));

      setIsInitialized(true);
      console.log("✅ App fully initialized");
    } catch (err) {
      console.error("❌ Error during initialization:", err);
      setIsInitialized(true);
    }
  };

  // ---------------------------------------------------------
  // 📥 LOAD + AUTO-FIX MECHANICS
  // ---------------------------------------------------------
  const loadMechanicsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem("mechanics");
      console.log("🔍 RAW MECHANICS STORAGE:", stored);

      if (!stored) {
        setMechanics([]);
        return;
      }

      let parsed = JSON.parse(stored);

      parsed = fixMechanicData(parsed);

      if (parsed.length === 0) {
        await AsyncStorage.setItem("mechanics", JSON.stringify([]));
      }

      setMechanics(parsed);
      console.log("✅ Mechanics loaded:", parsed.length);
    } catch (err) {
      console.error("❌ Error loading mechanics:", err);
    }
  };

  // ---------------------------------------------------------
  // 👤 SAVE CURRENT USER
  // ---------------------------------------------------------
  const setCurrentUser = async (user: Customer | Mechanic | null) => {
    setCurrentUserState(user);

    if (user) {
      await AsyncStorage.setItem("currentUser", JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem("currentUser");
    }
  };

  // ---------------------------------------------------------
  // ➕ ADD CUSTOMER
  // ---------------------------------------------------------
  const addCustomer = async (customer: Customer) => {
    const updated = [...customers, customer];
    setCustomers(updated);
    await AsyncStorage.setItem("customers", JSON.stringify(updated));
  };

  // ---------------------------------------------------------
  // 🛠 ADD MECHANIC
  // ---------------------------------------------------------
  const addMechanic = async (mechanic: Mechanic) => {
    console.log("🛠 Adding mechanic:", mechanic.fullName);

    try {
      const stored = await AsyncStorage.getItem("mechanics");
      let list = stored ? JSON.parse(stored) : [];

      list = fixMechanicData(list);

      const updated = [...list, mechanic];

      await AsyncStorage.setItem("mechanics", JSON.stringify(updated));
      setMechanics(updated);

      console.log("✅ Mechanic saved:", mechanic.fullName);
      return true;
    } catch (err) {
      console.error("❌ Error adding mechanic:", err);
      return false;
    }
  };

  // ---------------------------------------------------------
  // REQUESTS / MESSAGES / REVIEWS
  // ---------------------------------------------------------
  const addRequest = async (request: ServiceRequest) => {
    const updated = [...requests, request];
    setRequests(updated);
    await AsyncStorage.setItem("requests", JSON.stringify(updated));
  };

  const updateRequest = async (requestId: string, updates: Partial<ServiceRequest>) => {
    const updated = requests.map(r =>
      r.id === requestId ? { ...r, ...updates } : r
    );
    setRequests(updated);
    await AsyncStorage.setItem("requests", JSON.stringify(updated));
  };

  const addMessage = async (message: Message) => {
    const updated = [...messages, message];
    setMessages(updated);
    await AsyncStorage.setItem("messages", JSON.stringify(updated));
  };

  const addReview = async (review: Review) => {
    const updated = [...reviews, review];
    setReviews(updated);
    await AsyncStorage.setItem("reviews", JSON.stringify(updated));
  };

  // ---------------------------------------------------------
  // 🔄 REFRESH MECHANICS
  // ---------------------------------------------------------
  const refreshMechanics = async () => {
    console.log("🔄 Refreshing mechanics...");
    await loadMechanicsFromStorage();
  };

  // ---------------------------------------------------------
  // PROVIDER
  // ---------------------------------------------------------
  return (
    <AppContext.Provider
      value={{
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
        refreshMechanics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};
