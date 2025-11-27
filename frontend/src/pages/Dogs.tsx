import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dogsApi } from '../services/api';
import { Dog } from '../types';
import { Dog as DogIcon, Plus, Edit, Trash2, ChevronRight } from 'lucide-react';

export default function Dogs() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    date_of_birth: '',
    gender: 'unknown' as 'male' | 'female' | 'unknown',
    weight: '',
    color: '',
    microchip_number: '',
    is_neutered: false,
    adoption_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDogs();
  }, []);

  async function fetchDogs() {
    try {
      const { dogs } = await dogsApi.getAll();
      setDogs(dogs);
    } catch (error) {
      console.error('Failed to fetch dogs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dogsApi.create({
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
      });
      setShowAddModal(false);
      setFormData({
        name: '', breed: '', date_of_birth: '', gender: 'unknown',
        weight: '', color: '', microchip_number: '', is_neutered: false, adoption_date: '',
      });
      fetchDogs();
    } catch (error) {
      console.error('Failed to create dog:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}'s profile?`)) return;
    try {
      await dogsApi.delete(id);
      fetchDogs();
    } catch (error) {
      console.error('Failed to delete dog:', error);
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
        <h1 className="text-2xl font-bold text-gray-900">My Dogs</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add Dog</span>
        </button>
      </div>

      {dogs.length === 0 ? (
        <div className="card text-center py-12">
          <DogIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs yet</h3>
          <p className="text-gray-500 mb-4">Add your first dog to start tracking their health and care.</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Your First Dog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dogs.map(dog => (
            <div key={dog.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {dog.photo_url ? (
                      <img src={dog.photo_url} alt={dog.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <DogIcon className="h-8 w-8 text-primary-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{dog.name}</h3>
                    <p className="text-gray-500">{dog.breed || 'Unknown breed'}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Link to={`/dogs/${dog.id}`} className="p-2 text-gray-400 hover:text-primary-500">
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(dog.id, dog.name)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {dog.date_of_birth && (
                  <p>Age: {calculateAge(dog.date_of_birth)}</p>
                )}
                {dog.weight && (
                  <p>Weight: {dog.weight} {dog.weight_unit}</p>
                )}
                {dog.gender !== 'unknown' && (
                  <p>Gender: {dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}</p>
                )}
              </div>

              {(dog.allergies?.length || dog.health_conditions?.length) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {dog.allergies?.map(a => (
                    <span key={a.id} className="badge-warning text-xs">{a.allergen}</span>
                  ))}
                  {dog.health_conditions?.filter(c => c.status === 'active').map(c => (
                    <span key={c.id} className="badge-danger text-xs">{c.condition_name}</span>
                  ))}
                </div>
              )}

              <Link
                to={`/dogs/${dog.id}`}
                className="flex items-center justify-center text-primary-600 hover:underline text-sm"
              >
                View Profile <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add Dog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add New Dog</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Breed</label>
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={e => setFormData({ ...formData, breed: e.target.value })}
                    className="input"
                    placeholder="e.g., Golden Retriever"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'unknown' })}
                    className="input"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Microchip Number</label>
                  <input
                    type="text"
                    value={formData.microchip_number}
                    onChange={e => setFormData({ ...formData, microchip_number: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Adoption Date</label>
                <input
                  type="date"
                  value={formData.adoption_date}
                  onChange={e => setFormData({ ...formData, adoption_date: e.target.value })}
                  className="input"
                />
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_neutered}
                  onChange={e => setFormData({ ...formData, is_neutered: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Spayed/Neutered</span>
              </label>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Adding...' : 'Add Dog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  const years = Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(((today.getTime() - birth.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}
