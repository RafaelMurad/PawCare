import { useEffect, useState } from 'react';
import { healthApi, dogsApi } from '../services/api';
import { Dog, HealthRecord, Medication } from '../types';
import { Heart, Plus, Pill, FileText, AlertCircle, TrendingUp } from 'lucide-react';

const RECORD_TYPES = [
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'dental', label: 'Dental' },
  { value: 'lab_work', label: 'Lab Work' },
  { value: 'other', label: 'Other' },
];

export default function Health() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<string>('');
  const [healthData, setHealthData] = useState<{
    records: HealthRecord[];
    medications: Medication[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'medications'>('records');

  const [recordForm, setRecordForm] = useState({
    dog_id: '',
    record_type: 'vet_visit' as HealthRecord['record_type'],
    record_date: '',
    title: '',
    description: '',
    vet_name: '',
    vet_clinic: '',
    cost: '',
  });

  const [medForm, setMedForm] = useState({
    dog_id: '',
    name: '',
    dosage: '',
    frequency: '',
    start_date: '',
    end_date: '',
    prescribed_by: '',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchDogs() {
      try {
        const { dogs } = await dogsApi.getAll();
        setDogs(dogs);
        if (dogs.length > 0) {
          setSelectedDog(dogs[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch dogs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDogs();
  }, []);

  useEffect(() => {
    if (selectedDog) {
      fetchHealthData(selectedDog);
    }
  }, [selectedDog]);

  async function fetchHealthData(dogId: string) {
    try {
      const data = await healthApi.getForDog(dogId);
      setHealthData({ records: data.records, medications: data.medications });
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    }
  }

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await healthApi.createRecord({
        ...recordForm,
        cost: recordForm.cost ? parseFloat(recordForm.cost) : undefined,
      });
      setShowAddRecord(false);
      setRecordForm({
        dog_id: selectedDog, record_type: 'vet_visit', record_date: '',
        title: '', description: '', vet_name: '', vet_clinic: '', cost: '',
      });
      fetchHealthData(selectedDog);
    } catch (error) {
      console.error('Failed to add record:', error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMed(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await healthApi.createMedication(medForm);
      setShowAddMed(false);
      setMedForm({
        dog_id: selectedDog, name: '', dosage: '', frequency: '',
        start_date: '', end_date: '', prescribed_by: '', reason: '',
      });
      fetchHealthData(selectedDog);
    } catch (error) {
      console.error('Failed to add medication:', error);
    } finally {
      setSubmitting(false);
    }
  }

  const activeMeds = healthData?.medications.filter(m => m.is_active) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="card text-center py-12">
        <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs yet</h3>
        <p className="text-gray-500">Add a dog first to track health records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Records</h1>
          <p className="text-gray-600 mt-1">Track vet visits, medications, and health history</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => { setShowAddMed(true); setMedForm({ ...medForm, dog_id: selectedDog }); }} className="btn-secondary flex items-center space-x-2">
            <Pill className="h-5 w-5" />
            <span>Add Medication</span>
          </button>
          <button onClick={() => { setShowAddRecord(true); setRecordForm({ ...recordForm, dog_id: selectedDog }); }} className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Dog Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {dogs.map(dog => (
          <button
            key={dog.id}
            onClick={() => setSelectedDog(dog.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedDog === dog.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {dog.name}
          </button>
        ))}
      </div>

      {/* Active Medications Alert */}
      {activeMeds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Pill className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Active Medications</h3>
              <div className="mt-2 space-y-1">
                {activeMeds.map(med => (
                  <p key={med.id} className="text-sm text-blue-700">
                    {med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('records')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'records'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Health Records</span>
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'medications'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pill className="h-4 w-4" />
            <span>Medications ({healthData?.medications.length || 0})</span>
          </button>
        </nav>
      </div>

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {healthData?.records.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No health records yet</p>
            </div>
          ) : (
            healthData?.records.map(record => (
              <div key={record.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{record.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(record.record_date).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                    {record.record_type.replace('_', ' ')}
                  </span>
                </div>
                {record.description && (
                  <p className="text-gray-600 mt-3">{record.description}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  {record.vet_clinic && <span>Clinic: {record.vet_clinic}</span>}
                  {record.vet_name && <span>Vet: {record.vet_name}</span>}
                  {record.cost && <span>Cost: ${record.cost}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Medications Tab */}
      {activeTab === 'medications' && (
        <div className="space-y-4">
          {healthData?.medications.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No medications recorded</p>
            </div>
          ) : (
            healthData?.medications.map(med => (
              <div key={med.id} className={`card ${!med.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{med.name}</h3>
                    {med.dosage && <p className="text-sm text-gray-500">Dosage: {med.dosage}</p>}
                    {med.frequency && <p className="text-sm text-gray-500">Frequency: {med.frequency}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    med.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {med.is_active ? 'Active' : 'Completed'}
                  </span>
                </div>
                {med.reason && <p className="text-gray-600 mt-2">Reason: {med.reason}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  <span>Started: {new Date(med.start_date).toLocaleDateString()}</span>
                  {med.end_date && <span>Until: {new Date(med.end_date).toLocaleDateString()}</span>}
                  {med.prescribed_by && <span>Prescribed by: {med.prescribed_by}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Health Record</h2>
            </div>
            <form onSubmit={handleAddRecord} className="p-6 space-y-4">
              <div>
                <label className="label">Record Type</label>
                <select
                  value={recordForm.record_type}
                  onChange={e => setRecordForm({ ...recordForm, record_type: e.target.value as HealthRecord['record_type'] })}
                  className="input"
                >
                  {RECORD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={recordForm.title}
                  onChange={e => setRecordForm({ ...recordForm, title: e.target.value })}
                  className="input"
                  placeholder="e.g., Annual checkup"
                  required
                />
              </div>

              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={recordForm.record_date}
                  onChange={e => setRecordForm({ ...recordForm, record_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={recordForm.description}
                  onChange={e => setRecordForm({ ...recordForm, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vet Name</label>
                  <input
                    type="text"
                    value={recordForm.vet_name}
                    onChange={e => setRecordForm({ ...recordForm, vet_name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Clinic</label>
                  <input
                    type="text"
                    value={recordForm.vet_clinic}
                    onChange={e => setRecordForm({ ...recordForm, vet_clinic: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={recordForm.cost}
                  onChange={e => setRecordForm({ ...recordForm, cost: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddRecord(false)} className="btn-secondary">
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

      {/* Add Medication Modal */}
      {showAddMed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Medication</h2>
            </div>
            <form onSubmit={handleAddMed} className="p-6 space-y-4">
              <div>
                <label className="label">Medication Name *</label>
                <input
                  type="text"
                  value={medForm.name}
                  onChange={e => setMedForm({ ...medForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dosage</label>
                  <input
                    type="text"
                    value={medForm.dosage}
                    onChange={e => setMedForm({ ...medForm, dosage: e.target.value })}
                    className="input"
                    placeholder="e.g., 10mg"
                  />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <input
                    type="text"
                    value={medForm.frequency}
                    onChange={e => setMedForm({ ...medForm, frequency: e.target.value })}
                    className="input"
                    placeholder="e.g., twice daily"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    value={medForm.start_date}
                    onChange={e => setMedForm({ ...medForm, start_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={medForm.end_date}
                    onChange={e => setMedForm({ ...medForm, end_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Reason</label>
                <input
                  type="text"
                  value={medForm.reason}
                  onChange={e => setMedForm({ ...medForm, reason: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Prescribed By</label>
                <input
                  type="text"
                  value={medForm.prescribed_by}
                  onChange={e => setMedForm({ ...medForm, prescribed_by: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddMed(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
