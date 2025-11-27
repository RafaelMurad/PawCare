import { useEffect, useState } from 'react';
import { toysApi, dogsApi } from '../services/api';
import { Toy, Dog } from '../types';
import { Gift, Plus, Trash2, Star, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'toy', label: 'Toys' },
  { value: 'bed', label: 'Beds' },
  { value: 'collar', label: 'Collars' },
  { value: 'leash', label: 'Leashes' },
  { value: 'bowl', label: 'Bowls' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS = [
  { value: 'new', label: 'New', color: 'bg-green-100 text-green-700' },
  { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-700' },
  { value: 'fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'worn', label: 'Worn', color: 'bg-orange-100 text-orange-700' },
  { value: 'needs_replacement', label: 'Needs Replacement', color: 'bg-red-100 text-red-700' },
];

export default function Toys() {
  const [toys, setToys] = useState<Toy[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    dog_id: '',
    name: '',
    category: 'toy' as Toy['category'],
    brand: '',
    purchase_price: '',
    condition: 'new' as Toy['condition'],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [toysRes, dogsRes] = await Promise.all([
        toysApi.getAll(),
        dogsApi.getAll(),
      ]);
      setToys(toysRes.toys);
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
      await toysApi.create({
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
      });
      setShowAddModal(false);
      setFormData({
        dog_id: '', name: '', category: 'toy', brand: '', purchase_price: '', condition: 'new', notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await toysApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }

  async function handleToggleFavorite(id: string) {
    try {
      await toysApi.toggleFavorite(id);
      fetchData();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  const filteredToys = toys.filter(toy => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'favorites') return toy.is_favorite;
    if (activeFilter === 'needs_replacement') return toy.condition === 'needs_replacement' || toy.condition === 'worn';
    return toy.category === activeFilter;
  });

  const needsReplacement = toys.filter(t => t.condition === 'needs_replacement' || t.condition === 'worn');

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
          <h1 className="text-2xl font-bold text-gray-900">Toys & Supplies</h1>
          <p className="text-gray-600 mt-1">Track your dog's toys, gear, and supplies</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Needs Replacement Alert */}
      {needsReplacement.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800">Items Needing Attention</h3>
              <p className="text-sm text-orange-700 mt-1">
                {needsReplacement.length} item{needsReplacement.length > 1 ? 's' : ''} may need replacement
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({toys.length})
        </button>
        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFilter === 'favorites' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Favorites ({toys.filter(t => t.is_favorite).length})
        </button>
        <button
          onClick={() => setActiveFilter('needs_replacement')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFilter === 'needs_replacement' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Needs Replacement ({needsReplacement.length})
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === cat.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {filteredToys.length === 0 ? (
        <div className="card text-center py-12">
          <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredToys.map(toy => (
            <div key={toy.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{toy.name}</h3>
                  <p className="text-sm text-gray-500">{toy.dog_name}</p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleToggleFavorite(toy.id)}
                    className={`p-1.5 rounded ${toy.is_favorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                  >
                    <Star className="h-4 w-4" fill={toy.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleDelete(toy.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 capitalize">{toy.category}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  CONDITIONS.find(c => c.value === toy.condition)?.color || 'bg-gray-100'
                }`}>
                  {CONDITIONS.find(c => c.value === toy.condition)?.label}
                </span>
              </div>

              {toy.brand && (
                <p className="text-sm text-gray-500 mt-2">Brand: {toy.brand}</p>
              )}
              {toy.purchase_price && (
                <p className="text-sm text-gray-500">Price: ${toy.purchase_price}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Item</h2>
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
                <label className="label">Item Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Kong Classic"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as Toy['category'] })}
                    className="input"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value as Toy['condition'] })}
                    className="input"
                  >
                    {CONDITIONS.map(cond => (
                      <option key={cond.value} value={cond.value}>{cond.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
