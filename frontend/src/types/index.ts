// Core types for the application

export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface ParticipantPortion {
  participantId: string;
  portion: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  participants: ParticipantPortion[];
}

export interface Payment {
  participantId: string;
  amount: number;
}

export interface DebtSettlement {
  debtorId: string;
  settled: boolean;
}

export interface OrderData {
  id: string;
  name: string;
  participants: Participant[];
  items: OrderItem[];
  createdAt: number;
  payments: Payment[];
  isClosed: boolean;
  settlements: DebtSettlement[];
}

export interface UserProfile {
  name: string;
  avatar: string;
}

// API Response types
export interface ApiUser {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrderParticipant {
  id: number;
  role: 'creator' | 'member';
  user: ApiUser;
  createdAt: string;
}

export interface ApiOrder {
  id: number;
  title: string | null;
  isClosed: boolean;
  participants: ApiOrderParticipant[];
  createdAt: string;
}

export interface ApiOrderExpense {
  id: number;
  orderId: number;
  title: string | null;
  price: number;
  quantity: number;
  totalPrice: number;
  participantCount: number;
  isParticipating: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramData {
  token: string;
  user: {
    id: number;
    telegramId: number;
    username: string;
    firstName: string;
    createdAt: string;
    updatedAt: string;
  };
  order: {
    id: number;
    role: string;
  };
}

// Calculation types
export interface ParticipantTotal {
  id: string;
  name: string;
  color: string;
  shouldPay: number;
  paid: number;
  balance: number;
  items: { name: string; share: number }[];
}

export interface DebtRelation {
  fromId: string;
  fromName: string;
  fromColor: string;
  toId: string;
  toName: string;
  toColor: string;
  amount: number;
  settled: boolean;
}

export interface DebtSummary {
  orderId: string;
  orderName: string;
  creditorId: string;
  creditorName: string;
  creditorColor: string;
  debtorId: string;
  debtorName: string;
  debtorColor: string;
  amount: number;
  settled: boolean;
}
