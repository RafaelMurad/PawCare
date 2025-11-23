import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dogsApi, healthApi, vaccinationsApi } from '../services/api';
import { Dog, HealthRecord, Vaccination, Medication } from '../types';
import {
  Dog as DogIcon, ArrowLeft, Calendar, Syringe, Heart, Scale, AlertCircle, Pill
} from 'lucide-react';

export default function DogProfile() {
  const { id } = useParams<{ id: string }>();
  const [dog, setDog] = useState<Dog | null>(null);
  const [healthData, setHealthData] = useState<{
    records: HealthRecord[];
    medications: Medication[];
  } | null>(null);
  const [vaccinations, setVaccinations] = useState<{
    all: Vaccination[];
    upcoming: Vaccination[];
    overdue: Vaccination[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'vaccinations'>('overview');

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const [dogRes, healthRes, vaxRes] = await Promise.all([
          dogsApi.getOne(id!),
          healthApi.getForDog(id!),
          vaccinationsApi.getForDog(id!),
        ]);
        setDog(dogRes.dog);
        setHealthData({ records: healthRes.records, medications: healthRes.medications });
        setVaccinations({ all: vaxRes.vaccinations, upcoming: vaxRes.upcoming, overdue: vaxRes.overdue });
      } catch (error) {
        console.error('Failed to fetch dog data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Dog not found</h2>
        <Link to="/dogs" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to My Dogs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/dogs" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center space-x-4 flex-1">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
            {dog.photo_url ? (
              <img src={dog.photo_url} alt={dog.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <DogIcon className="h-10 w-10 text-primary-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dog.name}</h1>
            <p className="text-gray-500">{dog.breed || 'Unknown breed'}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {vaccinations?.overdue && vaccinations.overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">
            {vaccinations.overdue.length} overdue vaccination{vaccinations.overdue.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'health', 'vaccinations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <dl className="space-y-3">
              {dog.date_of_birth && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date of Birth</dt>
                  <dd className="text-gray-900">{new Date(dog.date_of_birth).toLocaleDateString()}</dd>
                </div>
              )}
              {dog.gender !== 'unknown' && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Gender</dt>
                  <dd className="text-gray-900">{dog.gender.charAt(0).toUpperCase() + dog.gender.slice(1)}</dd>
                </div>
              )}
              {dog.weight && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Weight</dt>
                  <dd className="text-gray-900">{dog.weight} {dog.weight_unit}</dd>
                </div>
              )}
              {dog.color && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Color</dt>
                  <dd className="text-gray-900">{dog.color}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Spayed/Neutered</dt>
                <dd className="text-gray-900">{dog.is_neutered ? 'Yes' : 'No'}</dd>
              </div>
              {dog.microchip_number && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Microchip</dt>
                  <dd className="text-gray-900 font-mono text-sm">{dog.microchip_number}</dd>
                </div>
              )}
              {dog.adoption_date && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Adoption Date</dt>
                  <dd className="text-gray-900">{new Date(dog.adoption_date).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Health Conditions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Health Conditions</h3>
            {dog.health_conditions?.length ? (
              <div className="space-y-3">
                {dog.health_conditions.map(condition => (
                  <div key={condition.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{condition.condition_name}</p>
                      {condition.diagnosed_date && (
                        <p className="text-sm text-gray-500">
                          Diagnosed: {new Date(condition.diagnosed_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      condition.status === 'active' ? 'bg-red-100 text-red-700' :
                      condition.status === 'managed' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {condition.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No health conditions recorded</p>
            )}
          </div>

          {/* Allergies */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Allergies</h3>
            {dog.allergies?.length ? (
              <div className="space-y-3">
                {dog.allergies.map(allergy => (
                  <div key={allergy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{allergy.allergen}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      allergy.severity === 'severe' ? 'bg-red-100 text-red-700' :
                      allergy.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {allergy.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No allergies recorded</p>
            )}
          </div>

          {/* Weight History */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Scale className="h-5 w-5 mr-2 text-gray-400" />
              Weight History
            </h3>
            {dog.weight_history?.length ? (
              <div className="space-y-2">
                {dog.weight_history.slice(0, 5).map(record => (
                  <div key={record.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{new Date(record.recorded_date).toLocaleDateString()}</span>
                    <span className="font-medium">{record.weight} {record.weight_unit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No weight records</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Active Medications */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Pill className="h-5 w-5 mr-2 text-gray-400" />
              Active Medications
            </h3>
            {healthData?.medications.filter(m => m.is_active).length ? (
              <div className="space-y-3">
                {healthData.medications.filter(m => m.is_active).map(med => (
                  <div key={med.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{med.name}</p>
                        {med.dosage && <p className="text-sm text-gray-500">Dosage: {med.dosage}</p>}
                        {med.frequency && <p className="text-sm text-gray-500">Frequency: {med.frequency}</p>}
                      </div>
                      <span className="badge-safe">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active medications</p>
            )}
          </div>

          {/* Health Records */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-gray-400" />
              Health Records
            </h3>
            {healthData?.records.length ? (
              <div className="space-y-3">
                {healthData.records.map(record => (
                  <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900">{record.title}</p>
                      <span className="text-xs text-gray-500">{record.record_type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(record.record_date).toLocaleDateString()}
                      {record.vet_clinic && ` at ${record.vet_clinic}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No health records</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vaccinations' && (
        <div className="space-y-6">
          {/* Upcoming */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-400" />
              Upcoming Vaccinations
            </h3>
            {vaccinations?.upcoming.length ? (
              <div className="space-y-3">
                {vaccinations.upcoming.map(vax => (
                  <div key={vax.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{vax.vaccine_name}</p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(vax.next_due_date!).toLocaleDateString()}
                      </p>
                    </div>
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming vaccinations</p>
            )}
          </div>

          {/* Vaccination History */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Syringe className="h-5 w-5 mr-2 text-gray-400" />
              Vaccination History
            </h3>
            {vaccinations?.all.length ? (
              <div className="space-y-3">
                {vaccinations.all.map(vax => (
                  <div key={vax.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{vax.vaccine_name}</p>
                        <p className="text-sm text-gray-500">
                          Administered: {new Date(vax.date_administered).toLocaleDateString()}
                        </p>
                        {vax.administered_by && (
                          <p className="text-sm text-gray-500">By: {vax.administered_by}</p>
                        )}
                      </div>
                      <span className="badge-safe">Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No vaccination records</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
