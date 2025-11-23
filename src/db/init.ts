import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/pawcare.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

export async function initDatabase(): Promise<void> {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dogs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dogs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      breed TEXT,
      date_of_birth DATE,
      gender TEXT CHECK(gender IN ('male', 'female', 'unknown')),
      weight REAL,
      weight_unit TEXT DEFAULT 'kg',
      color TEXT,
      microchip_number TEXT,
      photo_url TEXT,
      notes TEXT,
      is_neutered BOOLEAN DEFAULT FALSE,
      adoption_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Dog allergies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dog_allergies (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      allergen TEXT NOT NULL,
      severity TEXT CHECK(severity IN ('mild', 'moderate', 'severe')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Dog health conditions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dog_health_conditions (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      condition_name TEXT NOT NULL,
      diagnosed_date DATE,
      status TEXT CHECK(status IN ('active', 'managed', 'resolved')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Vaccinations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vaccinations (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      vaccine_name TEXT NOT NULL,
      date_administered DATE NOT NULL,
      next_due_date DATE,
      administered_by TEXT,
      lot_number TEXT,
      notes TEXT,
      reminder_sent BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Events/Reminders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dog_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT CHECK(event_type IN ('birthday', 'adoption_anniversary', 'vet_appointment', 'grooming', 'medication', 'custom')),
      event_date DATE NOT NULL,
      is_recurring BOOLEAN DEFAULT FALSE,
      recurrence_pattern TEXT,
      reminder_days_before INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE SET NULL
    )
  `);

  // Toys and supplies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS toys (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('toy', 'bed', 'collar', 'leash', 'bowl', 'grooming', 'clothing', 'other')),
      brand TEXT,
      purchase_date DATE,
      purchase_price REAL,
      condition TEXT CHECK(condition IN ('new', 'good', 'fair', 'worn', 'needs_replacement')),
      is_favorite BOOLEAN DEFAULT FALSE,
      notes TEXT,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Health records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_records (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      record_type TEXT CHECK(record_type IN ('vet_visit', 'weight', 'medication', 'surgery', 'dental', 'lab_work', 'other')),
      record_date DATE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      vet_name TEXT,
      vet_clinic TEXT,
      cost REAL,
      attachments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Weight history table for tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_history (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      weight REAL NOT NULL,
      weight_unit TEXT DEFAULT 'kg',
      recorded_date DATE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Medications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      dog_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      prescribed_by TEXT,
      reason TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
    )
  `);

  // Food safety database - pre-populated knowledge
  db.exec(`
    CREATE TABLE IF NOT EXISTS food_database (
      id TEXT PRIMARY KEY,
      food_name TEXT UNIQUE NOT NULL,
      category TEXT,
      is_safe BOOLEAN NOT NULL,
      safety_level TEXT CHECK(safety_level IN ('safe', 'safe_in_moderation', 'toxic', 'dangerous', 'varies')),
      description TEXT,
      benefits TEXT,
      risks TEXT,
      serving_suggestion TEXT,
      sources TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AI query history for learning
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dog_id TEXT,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      provider TEXT,
      model TEXT,
      sources TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Pre-populate food safety database
  await populateFoodDatabase();

  console.log('Database tables created successfully');
}

async function populateFoodDatabase(): Promise<void> {
  const foodData = [
    // Safe foods
    { food_name: 'Carrots', category: 'vegetable', is_safe: true, safety_level: 'safe', description: 'Excellent low-calorie snack', benefits: 'Good source of beta-carotene, fiber, vitamin K1, potassium. Good for dental health.', risks: 'Choking hazard if not cut properly', serving_suggestion: 'Raw or cooked, cut into bite-size pieces', sources: 'ASPCA, AKC, PetMD' },
    { food_name: 'Blueberries', category: 'fruit', is_safe: true, safety_level: 'safe', description: 'Superfood packed with antioxidants', benefits: 'Rich in antioxidants, fiber, vitamins C and K', risks: 'Can be a choking hazard for small dogs', serving_suggestion: 'Fresh or frozen, a few at a time as treats', sources: 'AKC, VCA Hospitals' },
    { food_name: 'Chicken', category: 'protein', is_safe: true, safety_level: 'safe', description: 'Excellent source of lean protein', benefits: 'High-quality protein, easy to digest', risks: 'Never feed cooked bones, avoid seasoning', serving_suggestion: 'Cooked, plain, boneless, skinless', sources: 'AKC, ASPCA' },
    { food_name: 'Peanut Butter', category: 'other', is_safe: true, safety_level: 'safe_in_moderation', description: 'Popular treat, but check ingredients', benefits: 'Good source of protein and healthy fats', risks: 'MUST be xylitol-free. High in calories.', serving_suggestion: 'Small amounts, unsalted, xylitol-free only', sources: 'AKC, ASPCA, FDA' },
    { food_name: 'Pumpkin', category: 'vegetable', is_safe: true, safety_level: 'safe', description: 'Great for digestive health', benefits: 'High in fiber, helps with digestive issues', risks: 'Avoid pumpkin pie filling with spices', serving_suggestion: 'Plain, cooked or canned (100% pumpkin)', sources: 'AKC, PetMD' },
    { food_name: 'Sweet Potato', category: 'vegetable', is_safe: true, safety_level: 'safe', description: 'Nutritious and delicious', benefits: 'Rich in dietary fiber, vitamin A, vitamin C', risks: 'Always cook before serving, never raw', serving_suggestion: 'Cooked, plain, no seasoning', sources: 'AKC, ASPCA' },
    { food_name: 'Apples', category: 'fruit', is_safe: true, safety_level: 'safe', description: 'Crunchy, healthy snack', benefits: 'Good source of vitamins A and C, fiber', risks: 'Remove seeds and core (contain cyanide)', serving_suggestion: 'Sliced, without seeds or core', sources: 'AKC, ASPCA' },
    { food_name: 'Salmon', category: 'protein', is_safe: true, safety_level: 'safe', description: 'Omega-3 rich protein source', benefits: 'Excellent source of omega-3 fatty acids, good for coat and skin', risks: 'Must be fully cooked, never raw (risk of parasites)', serving_suggestion: 'Fully cooked, boneless, plain', sources: 'AKC, PetMD, FDA' },
    { food_name: 'Rice', category: 'grain', is_safe: true, safety_level: 'safe', description: 'Easy to digest carbohydrate', benefits: 'Good for upset stomachs, easy to digest', risks: 'Can raise blood sugar in diabetic dogs', serving_suggestion: 'Plain, cooked white or brown rice', sources: 'AKC, VCA Hospitals' },
    { food_name: 'Watermelon', category: 'fruit', is_safe: true, safety_level: 'safe', description: 'Hydrating summer treat', benefits: 'Low calorie, high in vitamins A, B6, C, and potassium', risks: 'Remove seeds and rind', serving_suggestion: 'Seedless chunks, no rind', sources: 'AKC, ASPCA' },
    { food_name: 'Green Beans', category: 'vegetable', is_safe: true, safety_level: 'safe', description: 'Low-calorie, filling snack', benefits: 'Low calorie, high in fiber and vitamins', risks: 'Avoid canned with added salt', serving_suggestion: 'Plain, fresh, frozen, or canned (no salt)', sources: 'AKC, PetMD' },
    { food_name: 'Eggs', category: 'protein', is_safe: true, safety_level: 'safe', description: 'Complete protein source', benefits: 'High-quality protein, fatty acids, vitamins', risks: 'Should be fully cooked to avoid salmonella', serving_suggestion: 'Cooked (scrambled, boiled), no oil or seasoning', sources: 'AKC, ASPCA' },

    // Toxic/Dangerous foods
    { food_name: 'Chocolate', category: 'toxic', is_safe: false, safety_level: 'toxic', description: 'TOXIC - Never give to dogs', benefits: 'None', risks: 'Contains theobromine and caffeine, toxic to dogs. Dark chocolate is most dangerous.', serving_suggestion: 'NEVER feed to dogs', sources: 'ASPCA Poison Control, AKC, FDA' },
    { food_name: 'Grapes', category: 'toxic', is_safe: false, safety_level: 'dangerous', description: 'DANGEROUS - Can cause kidney failure', benefits: 'None', risks: 'Can cause acute kidney failure even in small amounts. Mechanism unknown.', serving_suggestion: 'NEVER feed to dogs', sources: 'ASPCA Poison Control, AKC, VCA Hospitals' },
    { food_name: 'Raisins', category: 'toxic', is_safe: false, safety_level: 'dangerous', description: 'DANGEROUS - Can cause kidney failure', benefits: 'None', risks: 'Same as grapes - can cause acute kidney failure', serving_suggestion: 'NEVER feed to dogs', sources: 'ASPCA Poison Control, AKC' },
    { food_name: 'Onions', category: 'toxic', is_safe: false, safety_level: 'toxic', description: 'TOXIC - Damages red blood cells', benefits: 'None', risks: 'Contains N-propyl disulfide, can cause anemia and red blood cell damage', serving_suggestion: 'NEVER feed to dogs, including in cooked foods', sources: 'ASPCA Poison Control, AKC, PetMD' },
    { food_name: 'Garlic', category: 'toxic', is_safe: false, safety_level: 'toxic', description: 'TOXIC - More potent than onions', benefits: 'None', risks: '5x more toxic than onions. Causes oxidative damage to red blood cells.', serving_suggestion: 'NEVER feed to dogs', sources: 'ASPCA Poison Control, AKC' },
    { food_name: 'Xylitol', category: 'toxic', is_safe: false, safety_level: 'dangerous', description: 'EXTREMELY DANGEROUS artificial sweetener', benefits: 'None', risks: 'Can cause rapid insulin release, leading to hypoglycemia, liver failure, and death', serving_suggestion: 'NEVER - check all peanut butter, candy, gum labels', sources: 'FDA, ASPCA Poison Control, VCA Hospitals' },
    { food_name: 'Alcohol', category: 'toxic', is_safe: false, safety_level: 'dangerous', description: 'DANGEROUS - Highly toxic', benefits: 'None', risks: 'Can cause vomiting, diarrhea, breathing problems, coma, death', serving_suggestion: 'NEVER give any alcohol to dogs', sources: 'ASPCA Poison Control, AKC' },
    { food_name: 'Avocado', category: 'toxic', is_safe: false, safety_level: 'toxic', description: 'Contains persin, toxic to dogs', benefits: 'None', risks: 'Contains persin which can cause vomiting and diarrhea. Pit is choking hazard.', serving_suggestion: 'Avoid completely', sources: 'ASPCA, AKC' },
    { food_name: 'Macadamia Nuts', category: 'toxic', is_safe: false, safety_level: 'toxic', description: 'TOXIC - Affects nervous system', benefits: 'None', risks: 'Can cause weakness, vomiting, tremors, hyperthermia', serving_suggestion: 'NEVER feed to dogs', sources: 'ASPCA Poison Control, AKC' },
    { food_name: 'Caffeine', category: 'toxic', is_safe: false, safety_level: 'toxic', description: 'TOXIC - Found in coffee, tea, energy drinks', benefits: 'None', risks: 'Stimulant toxic to dogs, can cause rapid heart rate, seizures', serving_suggestion: 'NEVER - includes coffee, tea, soda, energy drinks', sources: 'ASPCA Poison Control, FDA' },
    { food_name: 'Raw Yeast Dough', category: 'toxic', is_safe: false, safety_level: 'dangerous', description: 'DANGEROUS - Expands in stomach', benefits: 'None', risks: 'Can expand in stomach causing bloat, and produces alcohol as it ferments', serving_suggestion: 'NEVER feed raw dough', sources: 'ASPCA, AKC' },
    { food_name: 'Cooked Bones', category: 'toxic', is_safe: false, safety_level: 'dangerous', description: 'DANGEROUS - Can splinter', benefits: 'None', risks: 'Can splinter and cause choking, internal punctures, or blockages', serving_suggestion: 'NEVER feed cooked bones', sources: 'FDA, AKC, AVMA' },
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO food_database (id, food_name, category, is_safe, safety_level, description, benefits, risks, serving_suggestion, sources)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const food of foodData) {
    const id = food.food_name.toLowerCase().replace(/\s+/g, '-');
    insertStmt.run(id, food.food_name, food.category, food.is_safe ? 1 : 0, food.safety_level, food.description, food.benefits, food.risks, food.serving_suggestion, food.sources);
  }
}

// Run initialization if this file is executed directly
if (process.argv[1]?.endsWith('init.ts') || process.argv[1]?.endsWith('init.js')) {
  initDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}
