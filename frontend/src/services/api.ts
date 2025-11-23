const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// Auth
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: { id: string; email: string; name: string } }>(res);
  },

  register: async (email: string, password: string, name: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    return handleResponse<{ token: string; user: { id: string; email: string; name: string } }>(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    return handleResponse<{ user: { id: string; email: string; name: string } }>(res);
  },
};

// Dogs
export const dogsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/dogs`, { headers: getAuthHeaders() });
    return handleResponse<{ dogs: import('../types').Dog[] }>(res);
  },

  getOne: async (id: string) => {
    const res = await fetch(`${API_BASE}/dogs/${id}`, { headers: getAuthHeaders() });
    return handleResponse<{ dog: import('../types').Dog }>(res);
  },

  create: async (data: Partial<import('../types').Dog>) => {
    const res = await fetch(`${API_BASE}/dogs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ dog: import('../types').Dog }>(res);
  },

  update: async (id: string, data: Partial<import('../types').Dog>) => {
    const res = await fetch(`${API_BASE}/dogs/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ dog: import('../types').Dog }>(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/dogs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  recordWeight: async (id: string, weight: number, weight_unit: string) => {
    const res = await fetch(`${API_BASE}/dogs/${id}/weight`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ weight, weight_unit }),
    });
    return handleResponse<{ message: string }>(res);
  },
};

// Food
export const foodApi = {
  search: async (query: string) => {
    const res = await fetch(`${API_BASE}/food/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ results: import('../types').FoodItem[] }>(res);
  },

  getSafe: async () => {
    const res = await fetch(`${API_BASE}/food/safe`);
    return handleResponse<{ foods: import('../types').FoodItem[] }>(res);
  },

  getToxic: async () => {
    const res = await fetch(`${API_BASE}/food/toxic`);
    return handleResponse<{ foods: import('../types').FoodItem[] }>(res);
  },

  getByName: async (name: string) => {
    const res = await fetch(`${API_BASE}/food/${encodeURIComponent(name)}`);
    return handleResponse<{ food: import('../types').FoodItem }>(res);
  },
};

// Vaccinations
export const vaccinationsApi = {
  getForDog: async (dogId: string) => {
    const res = await fetch(`${API_BASE}/vaccinations/dog/${dogId}`, { headers: getAuthHeaders() });
    return handleResponse<{ vaccinations: import('../types').Vaccination[]; upcoming: import('../types').Vaccination[]; overdue: import('../types').Vaccination[] }>(res);
  },

  getUpcoming: async () => {
    const res = await fetch(`${API_BASE}/vaccinations/upcoming`, { headers: getAuthHeaders() });
    return handleResponse<{ upcoming: import('../types').Vaccination[]; overdue: import('../types').Vaccination[] }>(res);
  },

  create: async (data: Partial<import('../types').Vaccination>) => {
    const res = await fetch(`${API_BASE}/vaccinations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ vaccination: import('../types').Vaccination }>(res);
  },

  getSchedule: async () => {
    const res = await fetch(`${API_BASE}/vaccinations/schedule`, { headers: getAuthHeaders() });
    return handleResponse<{ schedules: unknown }>(res);
  },
};

// Events
export const eventsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/events`, { headers: getAuthHeaders() });
    return handleResponse<{ events: import('../types').Event[] }>(res);
  },

  getUpcoming: async () => {
    const res = await fetch(`${API_BASE}/events/upcoming`, { headers: getAuthHeaders() });
    return handleResponse<{ upcoming: import('../types').Event[]; today: import('../types').Event[] }>(res);
  },

  create: async (data: Partial<import('../types').Event>) => {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ event: import('../types').Event }>(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  getBirthdays: async () => {
    const res = await fetch(`${API_BASE}/events/birthdays`, { headers: getAuthHeaders() });
    return handleResponse<{ birthdays: { name: string; date_of_birth: string }[] }>(res);
  },
};

// Toys
export const toysApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/toys`, { headers: getAuthHeaders() });
    return handleResponse<{ toys: import('../types').Toy[] }>(res);
  },

  getForDog: async (dogId: string) => {
    const res = await fetch(`${API_BASE}/toys/dog/${dogId}`, { headers: getAuthHeaders() });
    return handleResponse<{ toys: import('../types').Toy[] }>(res);
  },

  create: async (data: Partial<import('../types').Toy>) => {
    const res = await fetch(`${API_BASE}/toys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ toy: import('../types').Toy }>(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/toys/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  toggleFavorite: async (id: string) => {
    const res = await fetch(`${API_BASE}/toys/${id}/favorite`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ is_favorite: boolean }>(res);
  },
};

// Health
export const healthApi = {
  getForDog: async (dogId: string) => {
    const res = await fetch(`${API_BASE}/health/dog/${dogId}`, { headers: getAuthHeaders() });
    return handleResponse<{
      records: import('../types').HealthRecord[];
      medications: import('../types').Medication[];
      weight_history: import('../types').WeightRecord[];
      conditions: import('../types').HealthCondition[];
    }>(res);
  },

  createRecord: async (data: Partial<import('../types').HealthRecord>) => {
    const res = await fetch(`${API_BASE}/health/record`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ record: import('../types').HealthRecord }>(res);
  },

  createMedication: async (data: Partial<import('../types').Medication>) => {
    const res = await fetch(`${API_BASE}/health/medication`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ medication: import('../types').Medication }>(res);
  },

  getSummary: async () => {
    const res = await fetch(`${API_BASE}/health/summary`, { headers: getAuthHeaders() });
    return handleResponse<{ summaries: unknown[] }>(res);
  },
};

// AI
export const aiApi = {
  ask: async (question: string, dogId?: string) => {
    const res = await fetch(`${API_BASE}/ai/ask`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, dog_id: dogId }),
    });
    return handleResponse<import('../types').AIResponse>(res);
  },

  foodCheck: async (foodName: string) => {
    const res = await fetch(`${API_BASE}/ai/food-check/${encodeURIComponent(foodName)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      food: string;
      from_database: boolean;
      is_safe?: boolean;
      safety_level?: string;
      quick_answer?: string;
      ai_response?: string;
      sources: string[];
    }>(res);
  },

  getBreedAdvice: async (breed: string, topic?: string) => {
    const res = await fetch(`${API_BASE}/ai/breed-advice`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ breed, topic }),
    });
    return handleResponse<{ breed: string; advice: string; sources: string[] }>(res);
  },

  analyzeSymptoms: async (symptoms: string[], dogId?: string) => {
    const res = await fetch(`${API_BASE}/ai/analyze-symptoms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ symptoms, dog_id: dogId }),
    });
    return handleResponse<{ analysis: string; sources: string[]; disclaimer: string }>(res);
  },

  getProviders: async () => {
    const res = await fetch(`${API_BASE}/ai/providers`, { headers: getAuthHeaders() });
    return handleResponse<{ available_providers: string[]; configured: boolean }>(res);
  },
};
