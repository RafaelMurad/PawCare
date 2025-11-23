import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/init.js';

export type AIProvider = 'openai' | 'anthropic';

interface AIResponse {
  answer: string;
  sources: string[];
  provider: string;
  model: string;
}

interface FoodInfo {
  food_name: string;
  is_safe: number;
  safety_level: string;
  description: string;
  benefits: string;
  risks: string;
  serving_suggestion: string;
  sources: string;
}

const SYSTEM_PROMPT = `You are PawCare AI, an expert veterinary assistant helping dog owners with pet care questions.

IMPORTANT GUIDELINES:
1. Always prioritize the safety and health of dogs
2. For food-related questions, be VERY clear about what is safe vs toxic
3. When uncertain, recommend consulting a veterinarian
4. Cite reputable sources like ASPCA, AKC, FDA, VCA Hospitals, PetMD
5. Consider the specific dog's breed, age, and health conditions when relevant
6. Be concise but thorough in your explanations
7. For emergencies, always recommend immediate veterinary care
8. Never recommend unverified home remedies that could be harmful

When providing information:
- Start with the most important safety information
- Explain WHY something is safe or dangerous
- Provide practical, actionable advice
- Include source citations at the end of your response

Format sources as: [Source: Organization Name]`;

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  private getFoodContext(query: string): string {
    // Search our food database for relevant information
    const searchTerms = query.toLowerCase().split(' ');
    const foods = db.prepare(`
      SELECT * FROM food_database
      WHERE LOWER(food_name) LIKE ? OR LOWER(description) LIKE ?
    `).all(`%${searchTerms.join('%')}%`, `%${searchTerms.join('%')}%`) as FoodInfo[];

    if (foods.length === 0) {
      // Try individual word matches
      const allFoods: FoodInfo[] = [];
      for (const term of searchTerms) {
        if (term.length > 2) {
          const results = db.prepare(`
            SELECT * FROM food_database WHERE LOWER(food_name) LIKE ?
          `).all(`%${term}%`) as FoodInfo[];
          allFoods.push(...results);
        }
      }
      if (allFoods.length > 0) {
        return this.formatFoodContext(allFoods);
      }
    }

    return foods.length > 0 ? this.formatFoodContext(foods) : '';
  }

  private formatFoodContext(foods: FoodInfo[]): string {
    const uniqueFoods = [...new Map(foods.map(f => [f.food_name, f])).values()];
    return `\n\nRELEVANT FOOD DATABASE INFORMATION:\n${uniqueFoods.map(f =>
      `- ${f.food_name}: ${f.is_safe ? 'SAFE' : 'NOT SAFE'} (${f.safety_level})
   Description: ${f.description}
   Benefits: ${f.benefits}
   Risks: ${f.risks}
   Serving: ${f.serving_suggestion}
   Sources: ${f.sources}`
    ).join('\n\n')}`;
  }

  async askQuestion(
    query: string,
    provider?: AIProvider,
    dogContext?: { name: string; breed?: string; age?: number; conditions?: string[] }
  ): Promise<AIResponse> {
    const selectedProvider = provider || (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'anthropic';

    // Build context with food database info
    let context = '';
    const foodRelatedKeywords = ['food', 'eat', 'feed', 'safe', 'toxic', 'can dogs', 'give my dog', 'snack', 'treat'];
    if (foodRelatedKeywords.some(kw => query.toLowerCase().includes(kw))) {
      context += this.getFoodContext(query);
    }

    // Add dog-specific context if provided
    if (dogContext) {
      context += `\n\nDOG PROFILE CONTEXT:
- Name: ${dogContext.name}
- Breed: ${dogContext.breed || 'Unknown'}
- Age: ${dogContext.age ? `${dogContext.age} years` : 'Unknown'}
- Health Conditions: ${dogContext.conditions?.join(', ') || 'None reported'}

Please consider this dog's specific characteristics in your response.`;
    }

    const fullPrompt = `${query}${context}`;

    if (selectedProvider === 'openai' && this.openai) {
      return this.askOpenAI(fullPrompt);
    } else if (selectedProvider === 'anthropic' && this.anthropic) {
      return this.askAnthropic(fullPrompt);
    } else if (this.anthropic) {
      return this.askAnthropic(fullPrompt);
    } else if (this.openai) {
      return this.askOpenAI(fullPrompt);
    }

    throw new Error('No AI provider configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
  }

  private async askOpenAI(prompt: string): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const answer = response.choices[0]?.message?.content || 'Unable to generate response';
    const sources = this.extractSources(answer);

    return {
      answer,
      sources,
      provider: 'openai',
      model,
    };
  }

  private async askAnthropic(prompt: string): Promise<AIResponse> {
    if (!this.anthropic) throw new Error('Anthropic not configured');

    const model = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const answer = textContent && 'text' in textContent ? textContent.text : 'Unable to generate response';
    const sources = this.extractSources(answer);

    return {
      answer,
      sources,
      provider: 'anthropic',
      model,
    };
  }

  private extractSources(text: string): string[] {
    const sourcePattern = /\[Source:\s*([^\]]+)\]/gi;
    const matches = text.matchAll(sourcePattern);
    const sources = new Set<string>();
    for (const match of matches) {
      sources.add(match[1].trim());
    }
    return Array.from(sources);
  }

  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    return providers;
  }
}

export const aiService = new AIService();
