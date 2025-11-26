export interface User {
  id: string;
  fullName: string;
  phone: string;
  profilePicture?: string;
  userType: 'customer' | 'mechanic';
  email: string;
  createdAt: Date;
}

export interface Customer extends User {
  carType: string;
  carPhoto?: string;
  licensePlate?: string;
  location: Location;
  paymentMethods: PaymentMethod[];
}

export interface Mechanic extends User {
  services: string[];
  location: Location;
  isAvailable: boolean;
  rating: number;
  reviews: Review[];
  experience: number;
  hourlyRate: number;
  totalJobs: number;
  specialization: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  description?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  mechanicId: string;
  carType: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'in_progress' | 'cancelled';
  location: Location;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  estimatedCost?: number;
  finalCost?: number;
  serviceType: string;
  urgency: 'low' | 'medium' | 'high';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  customerNotes?: string;
  mechanicNotes?: string;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'location' | 'system';
  imageUrl?: string;
  read: boolean;
}

export interface Review {
  id: string;
  mechanicId: string;
  customerId: string;
  requestId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  customerName: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay';
  lastFour?: string;
  isDefault: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'request' | 'message' | 'payment' | 'system';
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface EditableUserFields {
  fullName?: string;
  phone?: string;
  email?: string;
}

export interface EditableCustomerFields extends EditableUserFields {
  carType?: string;
  carPhoto?: string;
  licensePlate?: string;
  location?: Location;
}

export interface EditableMechanicFields extends EditableUserFields {
  services: string[];
  experience: number;
  hourlyRate: number;
  specialization: string[];
  description?: string;
}