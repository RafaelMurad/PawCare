import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const eventsRouter = Router();

// Apply auth to all routes
eventsRouter.use(authenticateToken);

// Get all events for user
eventsRouter.get('/', (req: AuthRequest, res: Response) => {
  try {
    const events = db.prepare(`
      SELECT e.*, d.name as dog_name FROM events e
      LEFT JOIN dogs d ON e.dog_id = d.id
      WHERE e.user_id = ?
      ORDER BY e.event_date ASC
    `).all(req.userId);

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get upcoming events (next 30 days)
eventsRouter.get('/upcoming', (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const events = db.prepare(`
      SELECT e.*, d.name as dog_name FROM events e
      LEFT JOIN dogs d ON e.dog_id = d.id
      WHERE e.user_id = ?
      AND e.is_active = 1
      AND e.event_date >= ?
      AND e.event_date <= ?
      ORDER BY e.event_date ASC
    `).all(req.userId, today, nextMonth.toISOString().split('T')[0]);

    // Also get today's events
    const todayEvents = db.prepare(`
      SELECT e.*, d.name as dog_name FROM events e
      LEFT JOIN dogs d ON e.dog_id = d.id
      WHERE e.user_id = ?
      AND e.is_active = 1
      AND date(e.event_date) = date(?)
    `).all(req.userId, today);

    res.json({ upcoming: events, today: todayEvents });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: 'Failed to get upcoming events' });
  }
});

// Get events for specific dog
eventsRouter.get('/dog/:dogId', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.dogId, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const events = db.prepare(`
      SELECT * FROM events
      WHERE dog_id = ?
      ORDER BY event_date ASC
    `).all(req.params.dogId);

    res.json({ events });
  } catch (error) {
    console.error('Get dog events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create event
eventsRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const {
      dog_id, title, description, event_type, event_date,
      is_recurring, recurrence_pattern, reminder_days_before
    } = req.body;

    if (!title || !event_date) {
      res.status(400).json({ error: 'Title and event_date are required' });
      return;
    }

    // Verify dog belongs to user if dog_id provided
    if (dog_id) {
      const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
        .get(dog_id, req.userId);
      if (!dog) {
        res.status(404).json({ error: 'Dog not found' });
        return;
      }
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO events (id, user_id, dog_id, title, description, event_type, event_date, is_recurring, recurrence_pattern, reminder_days_before)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.userId, dog_id || null, title, description || null,
      event_type || 'custom', event_date, is_recurring ? 1 : 0,
      recurrence_pattern || null, reminder_days_before || 1
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.status(201).json({ message: 'Event created', event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
eventsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const {
      title, description, event_type, event_date,
      is_recurring, recurrence_pattern, reminder_days_before, is_active
    } = req.body;

    db.prepare(`
      UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_type = COALESCE(?, event_type),
        event_date = COALESCE(?, event_date),
        is_recurring = COALESCE(?, is_recurring),
        recurrence_pattern = COALESCE(?, recurrence_pattern),
        reminder_days_before = COALESCE(?, reminder_days_before),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      title, description, event_type, event_date,
      is_recurring !== undefined ? (is_recurring ? 1 : 0) : null,
      recurrence_pattern, reminder_days_before,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json({ message: 'Event updated', event: updated });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
eventsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get events by type
eventsRouter.get('/type/:eventType', (req: AuthRequest, res: Response) => {
  try {
    const events = db.prepare(`
      SELECT e.*, d.name as dog_name FROM events e
      LEFT JOIN dogs d ON e.dog_id = d.id
      WHERE e.user_id = ? AND e.event_type = ?
      ORDER BY e.event_date ASC
    `).all(req.userId, req.params.eventType);

    res.json({ events });
  } catch (error) {
    console.error('Get events by type error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get birthdays this month
eventsRouter.get('/birthdays', (req: AuthRequest, res: Response) => {
  try {
    const currentMonth = new Date().getMonth() + 1;

    const birthdays = db.prepare(`
      SELECT d.id, d.name, d.date_of_birth, d.breed, d.photo_url
      FROM dogs d
      WHERE d.user_id = ?
      AND strftime('%m', d.date_of_birth) = ?
    `).all(req.userId, currentMonth.toString().padStart(2, '0'));

    res.json({
      month: new Date().toLocaleString('default', { month: 'long' }),
      birthdays
    });
  } catch (error) {
    console.error('Get birthdays error:', error);
    res.status(500).json({ error: 'Failed to get birthdays' });
  }
});
