import { useState, useEffect } from 'react';
import { foodApi, aiApi } from '../services/api';
import { FoodItem } from '../types';
import { Search, Check, X, AlertTriangle, Info, Loader } from 'lucide-react';

export default function FoodSafety() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [safeFoods, setSafeFoods] = useState<FoodItem[]>([]);
  const [toxicFoods, setToxicFoods] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'safe' | 'toxic'>('search');

  useEffect(() => {
    async function fetchFoods() {
      try {
        const [safeRes, toxicRes] = await Promise.all([
          foodApi.getSafe(),
          foodApi.getToxic(),
        ]);
        setSafeFoods(safeRes.foods);
        setToxicFoods(toxicRes.foods);
      } catch (error) {
        console.error('Failed to fetch foods:', error);
      } finally {
        setInitialLoading(false);
      }
    }
    fetchFoods();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchResults([]);
    setAiResponse(null);

    try {
      const { results } = await foodApi.search(searchQuery);
      setSearchResults(results);

      // If no results in database, ask AI
      if (results.length === 0) {
        const aiResult = await aiApi.foodCheck(searchQuery);
        if (aiResult.ai_response) {
          setAiResponse(aiResult.ai_response);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSafetyIcon(item: FoodItem) {
    if (item.safety_level === 'safe') {
      return <Check className="h-5 w-5 text-green-500" />;
    } else if (item.safety_level === 'safe_in_moderation') {
      return <Info className="h-5 w-5 text-yellow-500" />;
    } else if (item.safety_level === 'toxic') {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    } else {
      return <X className="h-5 w-5 text-red-500" />;
    }
  }

  function getSafetyBadge(level: string) {
    switch (level) {
      case 'safe': return 'badge-safe';
      case 'safe_in_moderation': return 'badge-warning';
      case 'toxic':
      case 'dangerous': return 'badge-danger';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Food Safety Guide</h1>
        <p className="text-gray-600 mt-1">
          Check if a food is safe for your dog. Information sourced from ASPCA, AKC, and veterinary resources.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search for a food (e.g., chocolate, chicken, grapes)"
          className="input pl-12 pr-24"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-1.5 px-4"
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Search Results */}
      {(searchResults.length > 0 || aiResponse) && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Search Results for "{searchQuery}"</h2>
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map(food => (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getSafetyIcon(food)}
                      <div>
                        <p className="font-medium text-gray-900">{food.food_name}</p>
                        <p className="text-sm text-gray-500">{food.description}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSafetyBadge(food.safety_level)}`}>
                      {food.safety_level.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : aiResponse ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">AI Response</p>
                  <p className="text-blue-700 text-sm mt-1 whitespace-pre-wrap">{aiResponse}</p>
                  <p className="text-xs text-blue-500 mt-2">
                    This information is AI-generated. Always consult your veterinarian for dietary advice.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'search', label: 'Browse All' },
            { id: 'safe', label: `Safe Foods (${safeFoods.length})` },
            { id: 'toxic', label: `Toxic Foods (${toxicFoods.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Food Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'safe' ? safeFoods : activeTab === 'toxic' ? toxicFoods : [...safeFoods, ...toxicFoods])
          .sort((a, b) => a.food_name.localeCompare(b.food_name))
          .map(food => (
            <button
              key={food.id}
              onClick={() => setSelectedFood(food)}
              className={`text-left p-4 rounded-lg border-2 transition-colors ${
                food.is_safe
                  ? 'border-green-200 bg-green-50 hover:bg-green-100'
                  : 'border-red-200 bg-red-50 hover:bg-red-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getSafetyIcon(food)}
                  <span className="font-medium text-gray-900">{food.food_name}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{food.description}</p>
            </button>
          ))}
      </div>

      {/* Food Detail Modal */}
      {selectedFood && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className={`p-6 ${selectedFood.is_safe ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSafetyIcon(selectedFood)}
                  <h2 className="text-xl font-semibold">{selectedFood.food_name}</h2>
                </div>
                <button onClick={() => setSelectedFood(null)} className="p-2 hover:bg-white/50 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full ${getSafetyBadge(selectedFood.safety_level)}`}>
                {selectedFood.safety_level.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Description</h3>
                <p className="text-gray-600">{selectedFood.description}</p>
              </div>

              {selectedFood.benefits && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Benefits</h3>
                  <p className="text-gray-600">{selectedFood.benefits}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium text-gray-900 mb-1">Risks</h3>
                <p className="text-gray-600">{selectedFood.risks}</p>
              </div>

              {selectedFood.serving_suggestion && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Serving Suggestion</h3>
                  <p className="text-gray-600">{selectedFood.serving_suggestion}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Sources: {selectedFood.sources}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
