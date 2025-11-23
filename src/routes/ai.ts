import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { aiService, AIProvider } from '../services/ai.js';

export const aiRouter = Router();

// Apply auth to all routes
aiRouter.use(authenticateToken);

interface Dog {
  id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
}

interface Condition {
  condition_name: string;
}

// Ask AI a question
aiRouter.post('/ask', async (req: AuthRequest, res: Response) => {
  try {
    const { question, dog_id, provider } = req.body;

    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    // Get dog context if dog_id provided
    let dogContext: { name: string; breed?: string; age?: number; conditions?: string[] } | undefined;
    if (dog_id) {
      const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
        .get(dog_id, req.userId) as Dog | undefined;

      if (dog) {
        const conditions = db.prepare('SELECT condition_name FROM dog_health_conditions WHERE dog_id = ?')
          .all(dog_id) as Condition[];

        let age: number | undefined;
        if (dog.date_of_birth) {
          const birthDate = new Date(dog.date_of_birth);
          const today = new Date();
          age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        dogContext = {
          name: dog.name,
          breed: dog.breed || undefined,
          age,
          conditions: conditions.map(c => c.condition_name)
        };
      }
    }

    const response = await aiService.askQuestion(
      question,
      provider as AIProvider | undefined,
      dogContext
    );

    // Save query history
    db.prepare(`
      INSERT INTO ai_queries (id, user_id, dog_id, query, response, provider, model, sources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), req.userId, dog_id || null, question,
      response.answer, response.provider, response.model,
      JSON.stringify(response.sources)
    );

    res.json({
      answer: response.answer,
      sources: response.sources,
      provider: response.provider,
      model: response.model
    });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({
      error: 'Failed to process AI query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quick food safety check
aiRouter.get('/food-check/:foodName', async (req: AuthRequest, res: Response) => {
  try {
    const { foodName } = req.params;

    // First check our database
    const dbFood = db.prepare(`
      SELECT * FROM food_database WHERE LOWER(food_name) = LOWER(?)
    `).get(foodName) as { is_safe: number; safety_level: string; description: string; risks: string; serving_suggestion: string; sources: string } | undefined;

    if (dbFood) {
      res.json({
        food: foodName,
        from_database: true,
        is_safe: Boolean(dbFood.is_safe),
        safety_level: dbFood.safety_level,
        quick_answer: dbFood.is_safe
          ? `${foodName} is generally safe for dogs. ${dbFood.description}`
          : `${foodName} is NOT safe for dogs. ${dbFood.description}`,
        details: {
          risks: dbFood.risks,
          serving_suggestion: dbFood.serving_suggestion
        },
        sources: dbFood.sources.split(', ')
      });
      return;
    }

    // If not in database, ask AI
    const response = await aiService.askQuestion(
      `Is ${foodName} safe for dogs to eat? Please provide a brief, direct answer with safety information and sources.`
    );

    res.json({
      food: foodName,
      from_database: false,
      ai_response: response.answer,
      sources: response.sources,
      provider: response.provider,
      disclaimer: 'This information is AI-generated. Always consult your veterinarian for dietary advice.'
    });
  } catch (error) {
    console.error('Food check error:', error);
    res.status(500).json({ error: 'Failed to check food safety' });
  }
});

// Get breed-specific advice
aiRouter.post('/breed-advice', async (req: AuthRequest, res: Response) => {
  try {
    const { breed, topic } = req.body;

    if (!breed) {
      res.status(400).json({ error: 'Breed is required' });
      return;
    }

    const question = topic
      ? `What specific advice do you have about ${topic} for ${breed} dogs? Include breed-specific considerations and cite sources.`
      : `What are the most important things a ${breed} owner should know? Cover health predispositions, exercise needs, grooming requirements, and dietary considerations. Cite sources.`;

    const response = await aiService.askQuestion(question);

    res.json({
      breed,
      topic: topic || 'general',
      advice: response.answer,
      sources: response.sources,
      provider: response.provider
    });
  } catch (error) {
    console.error('Breed advice error:', error);
    res.status(500).json({ error: 'Failed to get breed advice' });
  }
});

// Get available AI providers
aiRouter.get('/providers', (_req: AuthRequest, res: Response) => {
  const providers = aiService.getAvailableProviders();

  res.json({
    available_providers: providers,
    default_provider: process.env.DEFAULT_AI_PROVIDER || 'anthropic',
    configured: providers.length > 0
  });
});

// Get query history
aiRouter.get('/history', (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20, dog_id } = req.query;

    let query = `
      SELECT q.*, d.name as dog_name
      FROM ai_queries q
      LEFT JOIN dogs d ON q.dog_id = d.id
      WHERE q.user_id = ?
    `;
    const params: (string | number)[] = [req.userId!];

    if (dog_id) {
      query += ' AND q.dog_id = ?';
      params.push(dog_id as string);
    }

    query += ' ORDER BY q.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const history = db.prepare(query).all(...params);

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get query history' });
  }
});

// Health concern analyzer
aiRouter.post('/analyze-symptoms', async (req: AuthRequest, res: Response) => {
  try {
    const { symptoms, dog_id } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      res.status(400).json({ error: 'Symptoms array is required' });
      return;
    }

    let dogInfo = '';
    if (dog_id) {
      const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
        .get(dog_id, req.userId) as Dog | undefined;
      if (dog) {
        let age = 'unknown';
        if (dog.date_of_birth) {
          const birthDate = new Date(dog.date_of_birth);
          const today = new Date();
          const years = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          age = `${years} years`;
        }
        dogInfo = `\nDog info: ${dog.name}, ${dog.breed || 'unknown breed'}, ${age} old`;
      }
    }

    const question = `My dog is showing these symptoms: ${symptoms.join(', ')}.${dogInfo}

Please analyze these symptoms and provide:
1. Possible causes (from most to least likely)
2. Whether this requires immediate veterinary attention (emergency vs can wait)
3. What information I should gather before calling the vet
4. Any safe first-aid measures while waiting to see a vet

IMPORTANT: Always err on the side of caution and recommend veterinary consultation. Cite medical sources.`;

    const response = await aiService.askQuestion(question);

    res.json({
      symptoms,
      analysis: response.answer,
      sources: response.sources,
      provider: response.provider,
      disclaimer: 'This is not a substitute for professional veterinary care. If your dog is in distress, please contact your veterinarian or emergency animal hospital immediately.'
    });
  } catch (error) {
    console.error('Symptom analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze symptoms' });
  }
});
