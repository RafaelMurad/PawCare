import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const vaccinationsRouter = Router();

// Apply auth to all routes
vaccinationsRouter.use(authenticateToken);

// Standard vaccination schedules for reference
const VACCINATION_SCHEDULES = {
  puppy: [
    { name: 'DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)', weeks: [6, 10, 14, 18], booster: 'yearly' },
    { name: 'Rabies', weeks: [16], booster: 'every 1-3 years depending on local law' },
    { name: 'Bordetella (Kennel Cough)', weeks: [8], booster: 'every 6-12 months' },
    { name: 'Leptospirosis', weeks: [12, 16], booster: 'yearly' },
    { name: 'Lyme Disease', weeks: [12, 16], booster: 'yearly', note: 'if in endemic area' },
    { name: 'Canine Influenza', weeks: [8, 12], booster: 'yearly', note: 'if high risk' },
  ],
  adult: [
    { name: 'DHPP', frequency: 'Every 1-3 years' },
    { name: 'Rabies', frequency: 'Every 1-3 years (per local law)' },
    { name: 'Bordetella', frequency: 'Every 6-12 months' },
    { name: 'Leptospirosis', frequency: 'Yearly' },
    { name: 'Lyme Disease', frequency: 'Yearly (if needed)' },
    { name: 'Canine Influenza', frequency: 'Yearly (if needed)' },
  ]
};

// Get vaccination schedule reference
vaccinationsRouter.get('/schedule', (_req: AuthRequest, res: Response) => {
  res.json({
    schedules: VACCINATION_SCHEDULES,
    disclaimer: 'This is general guidance. Always consult your veterinarian for your dog\'s specific vaccination needs.',
    sources: ['AAHA (American Animal Hospital Association)', 'AVMA (American Veterinary Medical Association)']
  });
});

// Get all vaccinations for a dog
vaccinationsRouter.get('/dog/:dogId', (req: AuthRequest, res: Response) => {
  try {
    // Verify dog belongs to user
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.dogId, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const vaccinations = db.prepare(`
      SELECT * FROM vaccinations
      WHERE dog_id = ?
      ORDER BY date_administered DESC
    `).all(req.params.dogId);

    // Get upcoming vaccinations
    const today = new Date().toISOString().split('T')[0];
    const upcoming = db.prepare(`
      SELECT * FROM vaccinations
      WHERE dog_id = ? AND next_due_date >= ?
      ORDER BY next_due_date ASC
    `).all(req.params.dogId, today);

    // Get overdue vaccinations
    const overdue = db.prepare(`
      SELECT * FROM vaccinations
      WHERE dog_id = ? AND next_due_date < ? AND next_due_date IS NOT NULL
      ORDER BY next_due_date ASC
    `).all(req.params.dogId, today);

    res.json({
      vaccinations,
      upcoming,
      overdue,
      total: vaccinations.length
    });
  } catch (error) {
    console.error('Get vaccinations error:', error);
    res.status(500).json({ error: 'Failed to get vaccinations' });
  }
});

// Add vaccination record
vaccinationsRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const {
      dog_id, vaccine_name, date_administered, next_due_date,
      administered_by, lot_number, notes
    } = req.body;

    if (!dog_id || !vaccine_name || !date_administered) {
      res.status(400).json({ error: 'dog_id, vaccine_name, and date_administered are required' });
      return;
    }

    // Verify dog belongs to user
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(dog_id, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO vaccinations (id, dog_id, vaccine_name, date_administered, next_due_date, administered_by, lot_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, dog_id, vaccine_name, date_administered, next_due_date || null, administered_by || null, lot_number || null, notes || null);

    // Create reminder event if next_due_date is set
    if (next_due_date) {
      db.prepare(`
        INSERT INTO events (id, user_id, dog_id, title, description, event_type, event_date, reminder_days_before)
        VALUES (?, ?, ?, ?, ?, 'vet_appointment', ?, 14)
      `).run(
        uuidv4(), req.userId, dog_id,
        `${vaccine_name} Vaccination Due`,
        `Vaccination reminder for your dog`,
        next_due_date
      );
    }

    const vaccination = db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(id);
    res.status(201).json({ message: 'Vaccination recorded', vaccination });
  } catch (error) {
    console.error('Add vaccination error:', error);
    res.status(500).json({ error: 'Failed to add vaccination' });
  }
});

// Update vaccination
vaccinationsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    // Verify vaccination belongs to user's dog
    const vaccination = db.prepare(`
      SELECT v.* FROM vaccinations v
      JOIN dogs d ON v.dog_id = d.id
      WHERE v.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!vaccination) {
      res.status(404).json({ error: 'Vaccination record not found' });
      return;
    }

    const { vaccine_name, date_administered, next_due_date, administered_by, lot_number, notes } = req.body;

    db.prepare(`
      UPDATE vaccinations SET
        vaccine_name = COALESCE(?, vaccine_name),
        date_administered = COALESCE(?, date_administered),
        next_due_date = COALESCE(?, next_due_date),
        administered_by = COALESCE(?, administered_by),
        lot_number = COALESCE(?, lot_number),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(vaccine_name, date_administered, next_due_date, administered_by, lot_number, notes, req.params.id);

    const updated = db.prepare('SELECT * FROM vaccinations WHERE id = ?').get(req.params.id);
    res.json({ message: 'Vaccination updated', vaccination: updated });
  } catch (error) {
    console.error('Update vaccination error:', error);
    res.status(500).json({ error: 'Failed to update vaccination' });
  }
});

// Delete vaccination
vaccinationsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const vaccination = db.prepare(`
      SELECT v.* FROM vaccinations v
      JOIN dogs d ON v.dog_id = d.id
      WHERE v.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!vaccination) {
      res.status(404).json({ error: 'Vaccination record not found' });
      return;
    }

    db.prepare('DELETE FROM vaccinations WHERE id = ?').run(req.params.id);
    res.json({ message: 'Vaccination record deleted' });
  } catch (error) {
    console.error('Delete vaccination error:', error);
    res.status(500).json({ error: 'Failed to delete vaccination' });
  }
});

// Get all upcoming vaccinations for user
vaccinationsRouter.get('/upcoming', (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    const upcoming = db.prepare(`
      SELECT v.*, d.name as dog_name FROM vaccinations v
      JOIN dogs d ON v.dog_id = d.id
      WHERE d.user_id = ?
      AND v.next_due_date >= ?
      AND v.next_due_date <= ?
      ORDER BY v.next_due_date ASC
    `).all(req.userId, today, threeMonths.toISOString().split('T')[0]);

    const overdue = db.prepare(`
      SELECT v.*, d.name as dog_name FROM vaccinations v
      JOIN dogs d ON v.dog_id = d.id
      WHERE d.user_id = ?
      AND v.next_due_date < ?
      AND v.next_due_date IS NOT NULL
      ORDER BY v.next_due_date ASC
    `).all(req.userId, today);

    res.json({ upcoming, overdue });
  } catch (error) {
    console.error('Get upcoming vaccinations error:', error);
    res.status(500).json({ error: 'Failed to get upcoming vaccinations' });
  }
});
