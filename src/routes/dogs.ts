import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const dogsRouter = Router();

// Apply auth to all routes
dogsRouter.use(authenticateToken);

interface Dog {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
  gender: string | null;
  weight: number | null;
  weight_unit: string;
  color: string | null;
  microchip_number: string | null;
  photo_url: string | null;
  notes: string | null;
  is_neutered: boolean;
  adoption_date: string | null;
}

// Get all dogs for user
dogsRouter.get('/', (req: AuthRequest, res: Response) => {
  try {
    const dogs = db.prepare(`
      SELECT * FROM dogs WHERE user_id = ? ORDER BY name ASC
    `).all(req.userId);

    // Get allergies and conditions for each dog
    const dogsWithDetails = dogs.map((dog: unknown) => {
      const d = dog as Dog;
      const allergies = db.prepare('SELECT * FROM dog_allergies WHERE dog_id = ?').all(d.id);
      const conditions = db.prepare('SELECT * FROM dog_health_conditions WHERE dog_id = ?').all(d.id);
      return { ...d, allergies, health_conditions: conditions };
    });

    res.json({ dogs: dogsWithDetails });
  } catch (error) {
    console.error('Get dogs error:', error);
    res.status(500).json({ error: 'Failed to get dogs' });
  }
});

// Get single dog
dogsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare(`
      SELECT * FROM dogs WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.userId) as Dog | undefined;

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const allergies = db.prepare('SELECT * FROM dog_allergies WHERE dog_id = ?').all(dog.id);
    const conditions = db.prepare('SELECT * FROM dog_health_conditions WHERE dog_id = ?').all(dog.id);
    const weightHistory = db.prepare('SELECT * FROM weight_history WHERE dog_id = ? ORDER BY recorded_date DESC LIMIT 10').all(dog.id);

    res.json({
      dog: {
        ...dog,
        allergies,
        health_conditions: conditions,
        weight_history: weightHistory
      }
    });
  } catch (error) {
    console.error('Get dog error:', error);
    res.status(500).json({ error: 'Failed to get dog' });
  }
});

// Create new dog
dogsRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const {
      name, breed, date_of_birth, gender, weight, weight_unit,
      color, microchip_number, photo_url, notes, is_neutered, adoption_date,
      allergies, health_conditions
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Dog name is required' });
      return;
    }

    const dogId = uuidv4();

    db.prepare(`
      INSERT INTO dogs (id, user_id, name, breed, date_of_birth, gender, weight, weight_unit,
        color, microchip_number, photo_url, notes, is_neutered, adoption_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dogId, req.userId, name, breed || null, date_of_birth || null,
      gender || 'unknown', weight || null, weight_unit || 'kg',
      color || null, microchip_number || null, photo_url || null,
      notes || null, is_neutered ? 1 : 0, adoption_date || null
    );

    // Add allergies if provided
    if (allergies && Array.isArray(allergies)) {
      const insertAllergy = db.prepare(`
        INSERT INTO dog_allergies (id, dog_id, allergen, severity, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const allergy of allergies) {
        insertAllergy.run(uuidv4(), dogId, allergy.allergen, allergy.severity || 'moderate', allergy.notes || null);
      }
    }

    // Add health conditions if provided
    if (health_conditions && Array.isArray(health_conditions)) {
      const insertCondition = db.prepare(`
        INSERT INTO dog_health_conditions (id, dog_id, condition_name, diagnosed_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const condition of health_conditions) {
        insertCondition.run(uuidv4(), dogId, condition.condition_name, condition.diagnosed_date || null,
          condition.status || 'active', condition.notes || null);
      }
    }

    // Record initial weight if provided
    if (weight) {
      db.prepare(`
        INSERT INTO weight_history (id, dog_id, weight, weight_unit, recorded_date)
        VALUES (?, ?, ?, ?, date('now'))
      `).run(uuidv4(), dogId, weight, weight_unit || 'kg');
    }

    // Create birthday event if date_of_birth provided
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (thisYearBirthday < new Date()) {
        thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
      }

      db.prepare(`
        INSERT INTO events (id, user_id, dog_id, title, event_type, event_date, is_recurring, recurrence_pattern, reminder_days_before)
        VALUES (?, ?, ?, ?, 'birthday', ?, 1, 'yearly', 7)
      `).run(uuidv4(), req.userId, dogId, `${name}'s Birthday`, thisYearBirthday.toISOString().split('T')[0]);
    }

    // Create adoption anniversary event if adoption_date provided
    if (adoption_date) {
      const adoptDate = new Date(adoption_date);
      const thisYearAnniversary = new Date(new Date().getFullYear(), adoptDate.getMonth(), adoptDate.getDate());
      if (thisYearAnniversary < new Date()) {
        thisYearAnniversary.setFullYear(thisYearAnniversary.getFullYear() + 1);
      }

      db.prepare(`
        INSERT INTO events (id, user_id, dog_id, title, event_type, event_date, is_recurring, recurrence_pattern, reminder_days_before)
        VALUES (?, ?, ?, ?, 'adoption_anniversary', ?, 1, 'yearly', 7)
      `).run(uuidv4(), req.userId, dogId, `${name}'s Gotcha Day`, thisYearAnniversary.toISOString().split('T')[0]);
    }

    const createdDog = db.prepare('SELECT * FROM dogs WHERE id = ?').get(dogId);
    res.status(201).json({ message: 'Dog profile created', dog: createdDog });
  } catch (error) {
    console.error('Create dog error:', error);
    res.status(500).json({ error: 'Failed to create dog profile' });
  }
});

// Update dog
dogsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId) as Dog | undefined;

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const {
      name, breed, date_of_birth, gender, weight, weight_unit,
      color, microchip_number, photo_url, notes, is_neutered, adoption_date
    } = req.body;

    db.prepare(`
      UPDATE dogs SET
        name = COALESCE(?, name),
        breed = COALESCE(?, breed),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        weight = COALESCE(?, weight),
        weight_unit = COALESCE(?, weight_unit),
        color = COALESCE(?, color),
        microchip_number = COALESCE(?, microchip_number),
        photo_url = COALESCE(?, photo_url),
        notes = COALESCE(?, notes),
        is_neutered = COALESCE(?, is_neutered),
        adoption_date = COALESCE(?, adoption_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, breed, date_of_birth, gender, weight, weight_unit,
      color, microchip_number, photo_url, notes,
      is_neutered !== undefined ? (is_neutered ? 1 : 0) : null,
      adoption_date, req.params.id
    );

    // Record weight change if provided
    if (weight && weight !== dog.weight) {
      db.prepare(`
        INSERT INTO weight_history (id, dog_id, weight, weight_unit, recorded_date)
        VALUES (?, ?, ?, ?, date('now'))
      `).run(uuidv4(), req.params.id, weight, weight_unit || dog.weight_unit);
    }

    const updatedDog = db.prepare('SELECT * FROM dogs WHERE id = ?').get(req.params.id);
    res.json({ message: 'Dog profile updated', dog: updatedDog });
  } catch (error) {
    console.error('Update dog error:', error);
    res.status(500).json({ error: 'Failed to update dog profile' });
  }
});

// Delete dog
dogsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    db.prepare('DELETE FROM dogs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Dog profile deleted' });
  } catch (error) {
    console.error('Delete dog error:', error);
    res.status(500).json({ error: 'Failed to delete dog profile' });
  }
});

// Add allergy to dog
dogsRouter.post('/:id/allergies', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const { allergen, severity, notes } = req.body;
    if (!allergen) {
      res.status(400).json({ error: 'Allergen is required' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO dog_allergies (id, dog_id, allergen, severity, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, allergen, severity || 'moderate', notes || null);

    res.status(201).json({ message: 'Allergy added', allergy: { id, allergen, severity, notes } });
  } catch (error) {
    console.error('Add allergy error:', error);
    res.status(500).json({ error: 'Failed to add allergy' });
  }
});

// Add health condition to dog
dogsRouter.post('/:id/conditions', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const { condition_name, diagnosed_date, status, notes } = req.body;
    if (!condition_name) {
      res.status(400).json({ error: 'Condition name is required' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO dog_health_conditions (id, dog_id, condition_name, diagnosed_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, condition_name, diagnosed_date || null, status || 'active', notes || null);

    res.status(201).json({ message: 'Health condition added', condition: { id, condition_name, diagnosed_date, status, notes } });
  } catch (error) {
    console.error('Add condition error:', error);
    res.status(500).json({ error: 'Failed to add health condition' });
  }
});

// Record weight
dogsRouter.post('/:id/weight', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId) as Dog | undefined;

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const { weight, weight_unit, recorded_date, notes } = req.body;
    if (!weight) {
      res.status(400).json({ error: 'Weight is required' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO weight_history (id, dog_id, weight, weight_unit, recorded_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, weight, weight_unit || 'kg', recorded_date || new Date().toISOString().split('T')[0], notes || null);

    // Update current weight on dog profile
    db.prepare('UPDATE dogs SET weight = ?, weight_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(weight, weight_unit || dog.weight_unit, req.params.id);

    res.status(201).json({ message: 'Weight recorded' });
  } catch (error) {
    console.error('Record weight error:', error);
    res.status(500).json({ error: 'Failed to record weight' });
  }
});
