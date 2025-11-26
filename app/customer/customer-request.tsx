import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function CustomerRequests() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async () => {
      const { data } = await supabase
        .from("requests")
        .select(`
          *,
          mechanic:profiles!mechanic_id(*)
        `)
        .eq("customer_id", user.id)
        .order('created_at', { ascending: false });

      setRequests(data || []);
    };

    loadRequests();

    // Real-time updates for requests
    const subscription = supabase
      .channel('customer-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRequests(prev => 
              prev.map(req => 
                req.id === payload.new.id ? { ...req, ...payload.new } : req
              )
            );
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user]);

  const getStatusColor = (status, mechanicArrived, serviceCompleted) => {
    if (serviceCompleted) return '#4CAF50';
    if (mechanicArrived) return '#FF9800';
    if (status === 'accepted') return '#2196F3';
    if (status === 'rejected') return '#F44336';
    return '#FFC107'; // pending
  };

  const getStatusText = (status, mechanicArrived, serviceCompleted) => {
    if (serviceCompleted) return 'Service Completed';
    if (mechanicArrived) return 'Mechanic Arrived';
    if (status === 'accepted') return 'Accepted - On the way';
    if (status === 'rejected') return 'Declined';
    return 'Pending';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Service Requests</Text>
      
      {requests.length === 0 ? (
        <View style={styles.noRequests}>
          <Text style={styles.noRequestsText}>No service requests yet</Text>
          <Text style={styles.noRequestsSubtext}>
            Find a mechanic and send a request to get started!
          </Text>
        </View>
      ) : (
        requests.map((request) => (
          <TouchableOpacity
            key={request.id}
            style={styles.requestCard}
            onPress={() => router.push(`/customer/chat?id=${request.id}`)}
          >
            <View style={styles.requestHeader}>
              <Text style={styles.mechanicName}>
                {request.mechanic?.full_name || 'Mechanic'}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(
                  request.status, 
                  request.mechanic_arrived, 
                  request.service_completed
                )}
              ]}>
                <Text style={styles.statusText}>
                  {getStatusText(
                    request.status, 
                    request.mechanic_arrived, 
                    request.service_completed
                  )}
                </Text>
              </View>
            </View>
            
            <Text style={styles.serviceType}>
              Service: {request.mechanic?.service_type}
            </Text>
            <Text style={styles.phone}>📞 {request.mechanic?.phone}</Text>
            <Text style={styles.time}>
              {new Date(request.created_at).toLocaleString()}
            </Text>
            
            <Text style={styles.chatPrompt}>
              💬 Tap to chat with mechanic
            </Text>
          </TouchableOpacity>
        ))
      )}
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
  noRequests: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noRequestsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  noRequestsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  chatPrompt: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
});