export type UserRole = 'owner' | 'manager' | 'member';

export type BuzzResponse = 'ack' | 'five_min' | 'busy' | 'cancelled' | 'dismissed' | 'none';

export interface User {
  id: string;
  name: string;
  phone: string;
  pin_hash: string;
  role: UserRole;
  fcm_token: string;
  last_seen_at: number;
  is_active: boolean;
}

export interface Buzz {
  id: string;
  from_user_id: string;
  to_user_id: string;
  reason: string;
  note: string | null;
  created_at: number;
  responded_at: number | null;
  response: BuzzResponse;
  escalated: boolean;
}

export interface Reason {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface BuzzPayload {
  buzz_id: string;
  from_user_id: string;
  from_user_name: string;
  reason: string;
  note: string | null;
}
