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
  unitPrice: number;
  quantity: number;
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
  currentUserRole: 'creator' | 'member' | null;
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

export interface ApiOrderExpenseParticipant {
  userId: number;
  user: ApiUser;
  share: number;
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
  participants: ApiOrderExpenseParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiPayment {
  id: number;
  orderId: number;
  userId: number;
  user: ApiUser;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDebt {
  id: number;
  orderId: number;
  debtorId: number;
  debtor: ApiUser;
  creditorId: number;
  creditor: ApiUser;
  amount: number;
  status: 'active' | 'settlementRequested' | 'settled' | number;
  createdAt: string;
  settledAt: string | null;
}

export interface ApiMyDebts {
  totalOwedByMe: number;
  totalOwedToMe: number;
  owedByMe: ApiDebt[];
  owedToMe: ApiDebt[];
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
    role: 'creator' | 'member' | string;
  } | null;
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
  debtId?: string;
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
  status?: ApiDebt['status'];
}
