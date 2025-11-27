import { useEffect, useState } from 'react';
import { eventsApi, dogsApi } from '../services/api';
import { Event, Dog } from '../types';
import { Calendar, Plus, Trash2, Gift, Heart, Scissors, Pill, Star } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Gift, color: 'bg-pink-100 text-pink-600' },
  { value: 'adoption_anniversary', label: 'Gotcha Day', icon: Heart, color: 'bg-red-100 text-red-600' },
  { value: 'vet_appointment', label: 'Vet Appointment', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
  { value: 'grooming', label: 'Grooming', icon: Scissors, color: 'bg-purple-100 text-purple-600' },
  { value: 'medication', label: 'Medication', icon: Pill, color: 'bg-green-100 text-green-600' },
  { value: 'custom', label: 'Custom', icon: Star, color: 'bg-gray-100 text-gray-600' },
];

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    dog_id: '',
    title: '',
    description: '',
    event_type: 'custom' as Event['event_type'],
    event_date: '',
    is_recurring: false,
    reminder_days_before: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [allRes, upcomingRes, dogsRes] = await Promise.all([
        eventsApi.getAll(),
        eventsApi.getUpcoming(),
        dogsApi.getAll(),
      ]);
      setEvents(allRes.events);
      setTodayEvents(upcomingRes.today);
      setUpcomingEvents(upcomingRes.upcoming);
      setDogs(dogsRes.dogs);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await eventsApi.create({
        ...formData,
        dog_id: formData.dog_id || undefined,
      });
      setShowAddModal(false);
      setFormData({
        dog_id: '', title: '', description: '', event_type: 'custom',
        event_date: '', is_recurring: false, reminder_days_before: 1,
      });
      fetchData();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventsApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }

  function getEventIcon(type: Event['event_type']) {
    const eventType = EVENT_TYPES.find(et => et.value === type);
    if (!eventType) return Star;
    return eventType.icon;
  }

  function getEventColor(type: Event['event_type']) {
    const eventType = EVENT_TYPES.find(et => et.value === type);
    return eventType?.color || 'bg-gray-100 text-gray-600';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events & Reminders</h1>
          <p className="text-gray-600 mt-1">Track birthdays, appointments, and important dates</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <h2 className="font-semibold text-primary-800 mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Today's Events
          </h2>
          <div className="space-y-2">
            {todayEvents.map(event => {
              const Icon = getEventIcon(event.event_type);
              return (
                <div key={event.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    {event.dog_name && <p className="text-sm text-gray-500">{event.dog_name}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Upcoming Events (Next 30 Days)</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(event => {
              const Icon = getEventIcon(event.event_type);
              return (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                        {event.dog_name && ` · ${event.dog_name}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Events */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">All Events</h2>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No events yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()).map(event => {
              const Icon = getEventIcon(event.event_type);
              const isPast = new Date(event.event_date) < new Date();
              return (
                <div key={event.id} className={`flex items-center justify-between p-3 rounded-lg ${isPast ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString()}
                        {event.is_recurring && ' (recurring)'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Event</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="Event title"
                  required
                />
              </div>

              <div>
                <label className="label">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={e => setFormData({ ...formData, event_type: e.target.value as Event['event_type'] })}
                  className="input"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Dog (optional)</label>
                <select
                  value={formData.dog_id}
                  onChange={e => setFormData({ ...formData, dog_id: e.target.value })}
                  className="input"
                >
                  <option value="">No specific dog</option>
                  {dogs.map(dog => (
                    <option key={dog.id} value={dog.id}>{dog.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div>
                <label className="label">Remind me</label>
                <select
                  value={formData.reminder_days_before}
                  onChange={e => setFormData({ ...formData, reminder_days_before: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={0}>On the day</option>
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={7}>1 week before</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
