import { useEffect, useState } from 'react';
import { vaccinationsApi, dogsApi } from '../services/api';
import { Vaccination, Dog } from '../types';
import { Syringe, Calendar, AlertTriangle, Plus, Info } from 'lucide-react';

export default function Vaccinations() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [upcoming, setUpcoming] = useState<Vaccination[]>([]);
  const [overdue, setOverdue] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formData, setFormData] = useState({
    dog_id: '',
    vaccine_name: '',
    date_administered: '',
    next_due_date: '',
    administered_by: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [vaxRes, dogsRes] = await Promise.all([
        vaccinationsApi.getUpcoming(),
        dogsApi.getAll(),
      ]);
      setUpcoming(vaxRes.upcoming);
      setOverdue(vaxRes.overdue);
      setDogs(dogsRes.dogs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await vaccinationsApi.create(formData);
      setShowAddModal(false);
      setFormData({ dog_id: '', vaccine_name: '', date_administered: '', next_due_date: '', administered_by: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add vaccination:', error);
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Vaccinations</h1>
          <p className="text-gray-600 mt-1">Track and manage your dogs' vaccination records</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowScheduleModal(true)} className="btn-secondary flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Schedule Guide</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Vaccination</span>
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">Overdue Vaccinations</h3>
              <div className="mt-2 space-y-2">
                {overdue.map(vax => (
                  <div key={vax.id} className="text-sm text-red-700">
                    <span className="font-medium">{vax.dog_name}</span> - {vax.vaccine_name}
                    (was due {new Date(vax.next_due_date!).toLocaleDateString()})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Vaccinations */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-gray-400" />
          Upcoming Vaccinations
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming vaccinations in the next 3 months</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(vax => (
              <div key={vax.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Syringe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{vax.vaccine_name}</p>
                    <p className="text-sm text-gray-500">{vax.dog_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {new Date(vax.next_due_date!).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getDaysUntil(vax.next_due_date!)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dogs Summary */}
      {dogs.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Vaccination Status by Dog</h2>
          <div className="space-y-4">
            {dogs.map(dog => {
              const dogUpcoming = upcoming.filter(v => v.dog_name === dog.name);
              const dogOverdue = overdue.filter(v => v.dog_name === dog.name);
              return (
                <div key={dog.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{dog.name}</span>
                    <div className="flex space-x-2">
                      {dogOverdue.length > 0 && (
                        <span className="badge-danger">{dogOverdue.length} overdue</span>
                      )}
                      {dogUpcoming.length > 0 && (
                        <span className="badge-warning">{dogUpcoming.length} upcoming</span>
                      )}
                      {dogOverdue.length === 0 && dogUpcoming.length === 0 && (
                        <span className="badge-safe">Up to date</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Vaccination Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Vaccination Record</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Dog *</label>
                <select
                  value={formData.dog_id}
                  onChange={e => setFormData({ ...formData, dog_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a dog</option>
                  {dogs.map(dog => (
                    <option key={dog.id} value={dog.id}>{dog.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Vaccine Name *</label>
                <select
                  value={formData.vaccine_name}
                  onChange={e => setFormData({ ...formData, vaccine_name: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select vaccine</option>
                  <option value="DHPP (Distemper, Hepatitis, Parvo, Parainfluenza)">DHPP (Core)</option>
                  <option value="Rabies">Rabies</option>
                  <option value="Bordetella (Kennel Cough)">Bordetella</option>
                  <option value="Leptospirosis">Leptospirosis</option>
                  <option value="Lyme Disease">Lyme Disease</option>
                  <option value="Canine Influenza">Canine Influenza</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Date Administered *</label>
                <input
                  type="date"
                  value={formData.date_administered}
                  onChange={e => setFormData({ ...formData, date_administered: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Next Due Date</label>
                <input
                  type="date"
                  value={formData.next_due_date}
                  onChange={e => setFormData({ ...formData, next_due_date: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Administered By</label>
                <input
                  type="text"
                  value={formData.administered_by}
                  onChange={e => setFormData({ ...formData, administered_by: e.target.value })}
                  className="input"
                  placeholder="Vet name or clinic"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Adding...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Guide Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vaccination Schedule Guide</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Core Vaccines (Required)</h3>
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">DHPP</p>
                  <p className="text-sm text-gray-600">Puppies: 6-8, 10-12, 14-16 weeks; Boosters: Every 1-3 years</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Rabies</p>
                  <p className="text-sm text-gray-600">First: 12-16 weeks; Boosters: Every 1-3 years (per local law)</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-3">Non-Core Vaccines (Lifestyle-Based)</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Bordetella (Kennel Cough)</p>
                  <p className="text-sm text-gray-600">If boarding or daycare; Every 6-12 months</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Leptospirosis</p>
                  <p className="text-sm text-gray-600">If exposure to wildlife/water; Annual</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Lyme Disease</p>
                  <p className="text-sm text-gray-600">If in tick-endemic areas; Annual</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Sources: AAHA, AVMA. Always consult your veterinarian for your dog's specific needs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDaysUntil(date: string): string {
  const days = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}`;
  return `In ${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
}
