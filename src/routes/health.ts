import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const healthRouter = Router();

// Apply auth to all routes
healthRouter.use(authenticateToken);

// Get all health records for a dog
healthRouter.get('/dog/:dogId', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.dogId, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const records = db.prepare(`
      SELECT * FROM health_records
      WHERE dog_id = ?
      ORDER BY record_date DESC
    `).all(req.params.dogId);

    const medications = db.prepare(`
      SELECT * FROM medications
      WHERE dog_id = ?
      ORDER BY is_active DESC, start_date DESC
    `).all(req.params.dogId);

    const weightHistory = db.prepare(`
      SELECT * FROM weight_history
      WHERE dog_id = ?
      ORDER BY recorded_date DESC
      LIMIT 20
    `).all(req.params.dogId);

    const conditions = db.prepare(`
      SELECT * FROM dog_health_conditions
      WHERE dog_id = ?
    `).all(req.params.dogId);

    res.json({
      records,
      medications,
      weight_history: weightHistory,
      conditions
    });
  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({ error: 'Failed to get health records' });
  }
});

// Get health record by ID
healthRouter.get('/record/:id', (req: AuthRequest, res: Response) => {
  try {
    const record = db.prepare(`
      SELECT h.* FROM health_records h
      JOIN dogs d ON h.dog_id = d.id
      WHERE h.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!record) {
      res.status(404).json({ error: 'Health record not found' });
      return;
    }

    res.json({ record });
  } catch (error) {
    console.error('Get health record error:', error);
    res.status(500).json({ error: 'Failed to get health record' });
  }
});

// Create health record
healthRouter.post('/record', (req: AuthRequest, res: Response) => {
  try {
    const {
      dog_id, record_type, record_date, title, description,
      vet_name, vet_clinic, cost, attachments
    } = req.body;

    if (!dog_id || !record_type || !record_date || !title) {
      res.status(400).json({ error: 'dog_id, record_type, record_date, and title are required' });
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
      INSERT INTO health_records (id, dog_id, record_type, record_date, title, description, vet_name, vet_clinic, cost, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, dog_id, record_type, record_date, title, description || null,
      vet_name || null, vet_clinic || null, cost || null,
      attachments ? JSON.stringify(attachments) : null
    );

    const record = db.prepare('SELECT * FROM health_records WHERE id = ?').get(id);
    res.status(201).json({ message: 'Health record created', record });
  } catch (error) {
    console.error('Create health record error:', error);
    res.status(500).json({ error: 'Failed to create health record' });
  }
});

// Update health record
healthRouter.put('/record/:id', (req: AuthRequest, res: Response) => {
  try {
    const record = db.prepare(`
      SELECT h.* FROM health_records h
      JOIN dogs d ON h.dog_id = d.id
      WHERE h.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!record) {
      res.status(404).json({ error: 'Health record not found' });
      return;
    }

    const {
      record_type, record_date, title, description,
      vet_name, vet_clinic, cost, attachments
    } = req.body;

    db.prepare(`
      UPDATE health_records SET
        record_type = COALESCE(?, record_type),
        record_date = COALESCE(?, record_date),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        vet_name = COALESCE(?, vet_name),
        vet_clinic = COALESCE(?, vet_clinic),
        cost = COALESCE(?, cost),
        attachments = COALESCE(?, attachments)
      WHERE id = ?
    `).run(
      record_type, record_date, title, description,
      vet_name, vet_clinic, cost,
      attachments ? JSON.stringify(attachments) : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM health_records WHERE id = ?').get(req.params.id);
    res.json({ message: 'Health record updated', record: updated });
  } catch (error) {
    console.error('Update health record error:', error);
    res.status(500).json({ error: 'Failed to update health record' });
  }
});

// Delete health record
healthRouter.delete('/record/:id', (req: AuthRequest, res: Response) => {
  try {
    const record = db.prepare(`
      SELECT h.* FROM health_records h
      JOIN dogs d ON h.dog_id = d.id
      WHERE h.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!record) {
      res.status(404).json({ error: 'Health record not found' });
      return;
    }

    db.prepare('DELETE FROM health_records WHERE id = ?').run(req.params.id);
    res.json({ message: 'Health record deleted' });
  } catch (error) {
    console.error('Delete health record error:', error);
    res.status(500).json({ error: 'Failed to delete health record' });
  }
});

// === MEDICATIONS ===

// Get all medications for a dog
healthRouter.get('/medications/dog/:dogId', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.dogId, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const medications = db.prepare(`
      SELECT * FROM medications
      WHERE dog_id = ?
      ORDER BY is_active DESC, start_date DESC
    `).all(req.params.dogId);

    const active = medications.filter((m: { is_active: number }) => m.is_active);
    const inactive = medications.filter((m: { is_active: number }) => !m.is_active);

    res.json({ medications, active, inactive });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ error: 'Failed to get medications' });
  }
});

// Add medication
healthRouter.post('/medication', (req: AuthRequest, res: Response) => {
  try {
    const {
      dog_id, name, dosage, frequency, start_date,
      end_date, prescribed_by, reason, notes
    } = req.body;

    if (!dog_id || !name || !start_date) {
      res.status(400).json({ error: 'dog_id, name, and start_date are required' });
      return;
    }

    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(dog_id, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO medications (id, dog_id, name, dosage, frequency, start_date, end_date, prescribed_by, reason, is_active, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id, dog_id, name, dosage || null, frequency || null,
      start_date, end_date || null, prescribed_by || null,
      reason || null, notes || null
    );

    // Create reminder event for medication if it has frequency
    if (frequency) {
      db.prepare(`
        INSERT INTO events (id, user_id, dog_id, title, description, event_type, event_date, is_recurring, recurrence_pattern, reminder_days_before)
        VALUES (?, ?, ?, ?, ?, 'medication', ?, 1, ?, 0)
      `).run(
        uuidv4(), req.userId, dog_id,
        `Give ${name} medication`,
        `Dosage: ${dosage || 'As prescribed'}. Frequency: ${frequency}`,
        start_date, frequency
      );
    }

    const medication = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
    res.status(201).json({ message: 'Medication added', medication });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// Update medication
healthRouter.put('/medication/:id', (req: AuthRequest, res: Response) => {
  try {
    const medication = db.prepare(`
      SELECT m.* FROM medications m
      JOIN dogs d ON m.dog_id = d.id
      WHERE m.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!medication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    const {
      name, dosage, frequency, start_date, end_date,
      prescribed_by, reason, is_active, notes
    } = req.body;

    db.prepare(`
      UPDATE medications SET
        name = COALESCE(?, name),
        dosage = COALESCE(?, dosage),
        frequency = COALESCE(?, frequency),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        prescribed_by = COALESCE(?, prescribed_by),
        reason = COALESCE(?, reason),
        is_active = COALESCE(?, is_active),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      name, dosage, frequency, start_date, end_date,
      prescribed_by, reason, is_active !== undefined ? (is_active ? 1 : 0) : null,
      notes, req.params.id
    );

    const updated = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id);
    res.json({ message: 'Medication updated', medication: updated });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

// Delete medication
healthRouter.delete('/medication/:id', (req: AuthRequest, res: Response) => {
  try {
    const medication = db.prepare(`
      SELECT m.* FROM medications m
      JOIN dogs d ON m.dog_id = d.id
      WHERE m.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!medication) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.id);
    res.json({ message: 'Medication deleted' });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// Get health summary for dashboard
healthRouter.get('/summary', (req: AuthRequest, res: Response) => {
  try {
    // Get all user's dogs with latest health info
    const dogs = db.prepare(`
      SELECT d.id, d.name, d.breed, d.date_of_birth, d.weight, d.weight_unit
      FROM dogs d
      WHERE d.user_id = ?
    `).all(req.userId) as { id: string; name: string }[];

    const summaries = dogs.map(dog => {
      const activeMeds = db.prepare(`
        SELECT COUNT(*) as count FROM medications WHERE dog_id = ? AND is_active = 1
      `).get(dog.id) as { count: number };

      const upcomingVaccinations = db.prepare(`
        SELECT COUNT(*) as count FROM vaccinations
        WHERE dog_id = ? AND next_due_date >= date('now') AND next_due_date <= date('now', '+30 days')
      `).get(dog.id) as { count: number };

      const overdueVaccinations = db.prepare(`
        SELECT COUNT(*) as count FROM vaccinations
        WHERE dog_id = ? AND next_due_date < date('now') AND next_due_date IS NOT NULL
      `).get(dog.id) as { count: number };

      const recentRecords = db.prepare(`
        SELECT * FROM health_records
        WHERE dog_id = ?
        ORDER BY record_date DESC
        LIMIT 3
      `).all(dog.id);

      const conditions = db.prepare(`
        SELECT * FROM dog_health_conditions
        WHERE dog_id = ? AND status = 'active'
      `).all(dog.id);

      return {
        ...dog,
        active_medications: activeMeds.count,
        upcoming_vaccinations: upcomingVaccinations.count,
        overdue_vaccinations: overdueVaccinations.count,
        recent_records: recentRecords,
        active_conditions: conditions
      };
    });

    res.json({ summaries });
  } catch (error) {
    console.error('Get health summary error:', error);
    res.status(500).json({ error: 'Failed to get health summary' });
  }
});
