import cron from 'node-cron';
import { db } from '../db/init.js';

interface UpcomingVaccination {
  id: string;
  dog_name: string;
  vaccine_name: string;
  next_due_date: string;
  user_id: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  dog_name: string | null;
  user_id: string;
}

export function initScheduler(): void {
  // Run daily at 9 AM to check for upcoming reminders
  cron.schedule('0 9 * * *', () => {
    checkVaccinationReminders();
    checkEventReminders();
  });

  console.log('Scheduler initialized - checking reminders daily at 9 AM');
}

function checkVaccinationReminders(): void {
  const today = new Date();
  const reminderDate = new Date(today);
  reminderDate.setDate(reminderDate.getDate() + 7); // Check for vaccinations due in 7 days

  const upcomingVaccinations = db.prepare(`
    SELECT v.id, d.name as dog_name, v.vaccine_name, v.next_due_date, d.user_id
    FROM vaccinations v
    JOIN dogs d ON v.dog_id = d.id
    WHERE v.next_due_date <= ?
    AND v.next_due_date >= ?
    AND v.reminder_sent = 0
  `).all(reminderDate.toISOString().split('T')[0], today.toISOString().split('T')[0]) as UpcomingVaccination[];

  for (const vax of upcomingVaccinations) {
    console.log(`REMINDER: ${vax.dog_name}'s ${vax.vaccine_name} vaccination is due on ${vax.next_due_date}`);

    // Mark reminder as sent
    db.prepare('UPDATE vaccinations SET reminder_sent = 1 WHERE id = ?').run(vax.id);

    // In a real app, this would send an email/push notification
    // For now, we just log it and could store it in a notifications table
  }
}

function checkEventReminders(): void {
  const today = new Date();

  const upcomingEvents = db.prepare(`
    SELECT e.id, e.title, e.event_date, d.name as dog_name, e.user_id
    FROM events e
    LEFT JOIN dogs d ON e.dog_id = d.id
    WHERE e.is_active = 1
    AND date(e.event_date) BETWEEN date(?) AND date(?, '+' || e.reminder_days_before || ' days')
  `).all(
    today.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  ) as UpcomingEvent[];

  for (const event of upcomingEvents) {
    const dogInfo = event.dog_name ? ` for ${event.dog_name}` : '';
    console.log(`REMINDER: "${event.title}"${dogInfo} is coming up on ${event.event_date}`);

    // In a real app, this would send an email/push notification
  }
}

// Helper function to get upcoming reminders for a user (used by API)
export function getUpcomingReminders(userId: string): { vaccinations: UpcomingVaccination[]; events: UpcomingEvent[] } {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const vaccinations = db.prepare(`
    SELECT v.id, d.name as dog_name, v.vaccine_name, v.next_due_date, d.user_id
    FROM vaccinations v
    JOIN dogs d ON v.dog_id = d.id
    WHERE d.user_id = ?
    AND v.next_due_date >= ?
    AND v.next_due_date <= ?
    ORDER BY v.next_due_date ASC
  `).all(userId, today.toISOString().split('T')[0], nextMonth.toISOString().split('T')[0]) as UpcomingVaccination[];

  const events = db.prepare(`
    SELECT e.id, e.title, e.event_date, d.name as dog_name, e.user_id
    FROM events e
    LEFT JOIN dogs d ON e.dog_id = d.id
    WHERE e.user_id = ?
    AND e.is_active = 1
    AND e.event_date >= ?
    AND e.event_date <= ?
    ORDER BY e.event_date ASC
  `).all(userId, today.toISOString().split('T')[0], nextMonth.toISOString().split('T')[0]) as UpcomingEvent[];

  return { vaccinations, events };
}
