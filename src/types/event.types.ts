/**
 * Core event domain and Firestore entity types.
 */

export type EventType = 'wedding' | 'birthday' | 'community';

export type DietaryPreference = 'veg' | 'jain_veg' | 'non_veg' | 'vegan';

export type AttendanceStatus = 'attending' | 'declined' | 'tentative';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'high' | 'medium' | 'low';

export type PanicStatus = 'normal' | 'do_now' | 'outsource' | 'skip';

export type VendorStatus = 'researching' | 'contacted' | 'shortlisted' | 'booked' | 'rejected';

export type BudgetItemStatus = 'pending' | 'partial' | 'paid';

export interface ThemeIdea {
  name: string;
  palette: string[];
  decorDescription: string;
  musicSuggestion: string;
}

export interface PlanBItem {
  risk: string;
  trigger: string;
  contingency: string;
}

export interface VendorChecklistItem {
  label: string;
  done: boolean;
}

export interface VendorChecklistCategory {
  category: string;
  items: VendorChecklistItem[];
}

export interface Event {
  id: string;
  members: Record<string, 'owner'>;
  title: string;
  eventType: EventType;
  date: string; // YYYY-MM-DD
  city: string;
  guestCount: number;
  totalBudget: number; // Integer Rupees
  tradition: string;
  vibe: string;
  themes: ThemeIdea[];
  planB: PlanBItem[];
  vendorChecklist: VendorChecklistCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  city: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  allocatedAmount: number; // Integer Rupees
  actualAmount: number; // Integer Rupees
  paidAmount: number; // Integer Rupees
  status: BudgetItemStatus;
  isLocked: boolean;
  rationale: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  targetDate: string; // YYYY-MM-DD
  leadDays: number;
  status: TaskStatus;
  priority: TaskPriority;
  panicStatus: PanicStatus;
  isOverdueAtCreation?: boolean;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  category: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  quotedAmount: number; // Integer Rupees
  status: VendorStatus;
  notes: string;
  updatedAt?: string;
}

export interface Rsvp {
  id: string;
  guestName: string;
  guestCount: number;
  attendance: AttendanceStatus;
  dietaryPreference: DietaryPreference;
  note?: string;
  createdAt?: string;
}

export interface RunSheetItem {
  id: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "10:30 AM"
  activity: string;
  personInCharge: string;
  location: string;
  notes: string;
  order: number;
}
