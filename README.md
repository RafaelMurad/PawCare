# PawCare Hub

An AI-powered dog care companion app for pet owners. Track your dog's health, vaccinations, and get expert advice on nutrition and care.

## Features

### Dog Profiles
- Create detailed profiles for multiple dogs
- Track breed, age, weight, and health information
- Monitor allergies and health conditions
- Weight history tracking

### Food Safety Guide
- Comprehensive database of safe and toxic foods
- AI-powered food safety queries
- Sourced from ASPCA, AKC, and veterinary resources
- Clear safety ratings and serving suggestions

### Vaccination Tracker
- Track vaccination history for each dog
- Reminders for upcoming vaccinations
- Overdue vaccination alerts
- Standard vaccination schedule reference

### Events & Reminders
- Birthday and adoption anniversary tracking
- Vet appointment reminders
- Medication schedules
- Custom event creation

### Toys & Supplies
- Inventory tracking for toys, beds, collars, etc.
- Condition monitoring (when items need replacement)
- Favorite items marking
- Spending summary

### Health Records
- Vet visit documentation
- Medication tracking (active and completed)
- Surgery and dental records
- Lab work history

### AI Assistant
- Multi-model AI support (OpenAI GPT-4, Anthropic Claude)
- Dog-specific context-aware responses
- Food safety quick checks
- Breed-specific advice
- Symptom analysis
- All responses include source citations

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)
- JWT authentication
- node-cron for scheduled reminders

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Vite

### AI Integration
- OpenAI API (GPT-4)
- Anthropic API (Claude)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd pawcare-hub
```

2. Install dependencies:
```bash
npm run install:all
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key

# AI Providers (at least one required for AI features)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Default AI provider: 'openai' or 'anthropic'
DEFAULT_AI_PROVIDER=anthropic
```

4. Initialize the database:
```bash
npm run db:init
```

5. Start the development servers:

Backend:
```bash
npm run dev
```

Frontend (in another terminal):
```bash
npm run frontend:dev
```

6. Open http://localhost:5173 in your browser

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Dogs
- `GET /api/dogs` - List all dogs
- `POST /api/dogs` - Create dog profile
- `GET /api/dogs/:id` - Get dog details
- `PUT /api/dogs/:id` - Update dog
- `DELETE /api/dogs/:id` - Delete dog

### Food Safety
- `GET /api/food/search?q=` - Search foods
- `GET /api/food/safe` - List safe foods
- `GET /api/food/toxic` - List toxic foods
- `GET /api/food/:name` - Get food details

### Vaccinations
- `GET /api/vaccinations/dog/:dogId` - Get dog's vaccinations
- `POST /api/vaccinations` - Add vaccination record
- `GET /api/vaccinations/upcoming` - Get upcoming vaccinations
- `GET /api/vaccinations/schedule` - Get vaccination schedule guide

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create event
- `GET /api/events/upcoming` - Get upcoming events
- `DELETE /api/events/:id` - Delete event

### Toys & Supplies
- `GET /api/toys` - List all items
- `POST /api/toys` - Add item
- `DELETE /api/toys/:id` - Delete item
- `POST /api/toys/:id/favorite` - Toggle favorite

### Health Records
- `GET /api/health/dog/:dogId` - Get health data
- `POST /api/health/record` - Add health record
- `POST /api/health/medication` - Add medication

### AI Assistant
- `POST /api/ai/ask` - Ask AI question
- `GET /api/ai/food-check/:food` - Quick food safety check
- `POST /api/ai/breed-advice` - Get breed-specific advice
- `POST /api/ai/analyze-symptoms` - Analyze symptoms
- `GET /api/ai/providers` - Get available AI providers

## Food Safety Sources

The food safety database is compiled from:
- ASPCA Animal Poison Control Center
- American Kennel Club (AKC)
- FDA pet food guidelines
- VCA Animal Hospitals
- PetMD

## License

MIT
