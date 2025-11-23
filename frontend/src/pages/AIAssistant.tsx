import { useState, useEffect } from 'react';
import { aiApi, dogsApi } from '../services/api';
import { Dog } from '../types';
import { MessageCircle, Send, Loader, Dog as DogIcon, Info, AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

const SUGGESTED_QUESTIONS = [
  'What foods are toxic to dogs?',
  'How much exercise does my dog need?',
  'How often should I bathe my dog?',
  'What are signs my dog might be sick?',
  'How can I help my dog with separation anxiety?',
  'What vaccines does my puppy need?',
];

export default function AIAssistant() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{ available_providers: string[]; configured: boolean } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [dogsRes, providersRes] = await Promise.all([
          dogsApi.getAll(),
          aiApi.getProviders(),
        ]);
        setDogs(dogsRes.dogs);
        setProviderInfo(providersRes);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await aiApi.ask(userMessage, selectedDog || undefined);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please make sure your AI API keys are configured.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestedQuestion(question: string) {
    setInput(question);
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Pet Care Assistant</h1>
          <p className="text-gray-600">Ask questions about dog care, nutrition, health, and more</p>
        </div>
        {dogs.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Context:</span>
            <select
              value={selectedDog}
              onChange={e => setSelectedDog(e.target.value)}
              className="input py-1.5 text-sm"
            >
              <option value="">General advice</option>
              {dogs.map(dog => (
                <option key={dog.id} value={dog.id}>
                  {dog.name} {dog.breed ? `(${dog.breed})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* AI Not Configured Warning */}
      {providerInfo && !providerInfo.configured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">AI Not Configured</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Please configure your AI API keys (OPENAI_API_KEY or ANTHROPIC_API_KEY) in the .env file to enable the AI assistant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 bg-gray-50 rounded-xl overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <DogIcon className="h-8 w-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How can I help you today?</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                I can answer questions about dog nutrition, health, training, and care.
                All responses are sourced from veterinary resources.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {SUGGESTED_QUESTIONS.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-gray-200'
                }`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 flex items-center">
                        <Info className="h-3 w-3 mr-1" />
                        Sources: {message.sources.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <Loader className="h-5 w-5 animate-spin text-primary-500" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about dog care, food safety, health..."
              className="flex-1 input"
              disabled={loading || (providerInfo && !providerInfo.configured)}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || (providerInfo && !providerInfo.configured)}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Responses are AI-generated. Always consult your veterinarian for medical advice.
          </p>
        </form>
      </div>
    </div>
  );
}
