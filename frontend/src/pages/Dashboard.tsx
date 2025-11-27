import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dogsApi, eventsApi, vaccinationsApi } from '../services/api';
import { Dog, Event, Vaccination } from '../types';
import {
  Dog as DogIcon, Calendar, Syringe, AlertTriangle,
  ChevronRight, Plus, Heart
} from 'lucide-react';

export default function Dashboard() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [upcomingVax, setUpcomingVax] = useState<Vaccination[]>([]);
  const [overdueVax, setOverdueVax] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dogsRes, eventsRes, vaxRes] = await Promise.all([
          dogsApi.getAll(),
          eventsApi.getUpcoming(),
          vaccinationsApi.getUpcoming(),
        ]);
        setDogs(dogsRes.dogs);
        setUpcomingEvents(eventsRes.upcoming);
        setTodayEvents(eventsRes.today);
        setUpcomingVax(vaxRes.upcoming);
        setOverdueVax(vaxRes.overdue);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/dogs" className="btn-primary flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add Dog</span>
        </Link>
      </div>

      {/* Alerts */}
      {overdueVax.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Overdue Vaccinations</h3>
            <p className="text-red-600 text-sm mt-1">
              You have {overdueVax.length} overdue vaccination{overdueVax.length > 1 ? 's' : ''}.
              <Link to="/vaccinations" className="underline ml-1">View details</Link>
            </p>
          </div>
        </div>
      )}

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <h3 className="font-medium text-primary-800 mb-2">Today's Events</h3>
          <div className="space-y-2">
            {todayEvents.map(event => (
              <div key={event.id} className="flex items-center space-x-2 text-primary-700">
                <Calendar className="h-4 w-4" />
                <span>{event.title}</span>
                {event.dog_name && <span className="text-primary-500">({event.dog_name})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Dogs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Dogs</h2>
          <Link to="/dogs" className="text-primary-600 hover:underline text-sm flex items-center">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {dogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DogIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No dogs added yet</p>
            <Link to="/dogs" className="text-primary-600 hover:underline mt-1 inline-block">
              Add your first dog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dogs.slice(0, 3).map(dog => (
              <Link
                key={dog.id}
                to={`/dogs/${dog.id}`}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {dog.photo_url ? (
                    <img src={dog.photo_url} alt={dog.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <DogIcon className="h-7 w-7 text-primary-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{dog.name}</h3>
                  <p className="text-sm text-gray-500">{dog.breed || 'Unknown breed'}</p>
                  {dog.weight && (
                    <p className="text-xs text-gray-400">{dog.weight} {dog.weight_unit}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/dogs" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DogIcon className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dogs.length}</p>
              <p className="text-sm text-gray-500">Dogs</p>
            </div>
          </div>
        </Link>

        <Link to="/vaccinations" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Syringe className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingVax.length}</p>
              <p className="text-sm text-gray-500">Upcoming Vaccines</p>
            </div>
          </div>
        </Link>

        <Link to="/events" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
              <p className="text-sm text-gray-500">Upcoming Events</p>
            </div>
          </div>
        </Link>

        <Link to="/health" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overdueVax.length}</p>
              <p className="text-sm text-gray-500">Overdue Items</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          <Link to="/events" className="text-primary-600 hover:underline text-sm flex items-center">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
                      {event.dog_name && ` - ${event.dog_name}`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  event.event_type === 'birthday' ? 'bg-pink-100 text-pink-700' :
                  event.event_type === 'vet_appointment' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {event.event_type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
