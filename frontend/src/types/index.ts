export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Dog {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'unknown';
  weight: number | null;
  weight_unit: string;
  color: string | null;
  microchip_number: string | null;
  photo_url: string | null;
  notes: string | null;
  is_neutered: boolean;
  adoption_date: string | null;
  allergies?: Allergy[];
  health_conditions?: HealthCondition[];
  weight_history?: WeightRecord[];
}

export interface Allergy {
  id: string;
  dog_id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes: string | null;
}

export interface HealthCondition {
  id: string;
  dog_id: string;
  condition_name: string;
  diagnosed_date: string | null;
  status: 'active' | 'managed' | 'resolved';
  notes: string | null;
}

export interface WeightRecord {
  id: string;
  dog_id: string;
  weight: number;
  weight_unit: string;
  recorded_date: string;
  notes: string | null;
}

export interface Vaccination {
  id: string;
  dog_id: string;
  vaccine_name: string;
  date_administered: string;
  next_due_date: string | null;
  administered_by: string | null;
  lot_number: string | null;
  notes: string | null;
  dog_name?: string;
}

export interface Event {
  id: string;
  user_id: string;
  dog_id: string | null;
  title: string;
  description: string | null;
  event_type: 'birthday' | 'adoption_anniversary' | 'vet_appointment' | 'grooming' | 'medication' | 'custom';
  event_date: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  reminder_days_before: number;
  is_active: boolean;
  dog_name?: string;
}

export interface Toy {
  id: string;
  dog_id: string;
  name: string;
  category: 'toy' | 'bed' | 'collar' | 'leash' | 'bowl' | 'grooming' | 'clothing' | 'other';
  brand: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  condition: 'new' | 'good' | 'fair' | 'worn' | 'needs_replacement';
  is_favorite: boolean;
  notes: string | null;
  photo_url: string | null;
  dog_name?: string;
}

export interface HealthRecord {
  id: string;
  dog_id: string;
  record_type: 'vet_visit' | 'weight' | 'medication' | 'surgery' | 'dental' | 'lab_work' | 'other';
  record_date: string;
  title: string;
  description: string | null;
  vet_name: string | null;
  vet_clinic: string | null;
  cost: number | null;
  attachments: string | null;
}

export interface Medication {
  id: string;
  dog_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
  reason: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface FoodItem {
  id: string;
  food_name: string;
  category: string;
  is_safe: boolean;
  safety_level: 'safe' | 'safe_in_moderation' | 'toxic' | 'dangerous' | 'varies';
  description: string;
  benefits: string;
  risks: string;
  serving_suggestion: string;
  sources: string;
}

export interface AIResponse {
  answer: string;
  sources: string[];
  provider: string;
  model: string;
}
