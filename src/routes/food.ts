import { Router, Request, Response } from 'express';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const foodRouter = Router();

interface FoodItem {
  id: string;
  food_name: string;
  category: string;
  is_safe: number;
  safety_level: string;
  description: string;
  benefits: string;
  risks: string;
  serving_suggestion: string;
  sources: string;
}

// Search food database (public endpoint)
foodRouter.get('/search', (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const foods = db.prepare(`
      SELECT * FROM food_database
      WHERE LOWER(food_name) LIKE LOWER(?)
      OR LOWER(category) LIKE LOWER(?)
      ORDER BY food_name ASC
    `).all(`%${q}%`, `%${q}%`) as FoodItem[];

    res.json({
      results: foods.map(f => ({
        ...f,
        is_safe: Boolean(f.is_safe)
      })),
      query: q
    });
  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({ error: 'Failed to search food database' });
  }
});

// Get all foods by category
foodRouter.get('/category/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const foods = db.prepare(`
      SELECT * FROM food_database
      WHERE category = ?
      ORDER BY food_name ASC
    `).all(category) as FoodItem[];

    res.json({
      category,
      foods: foods.map(f => ({
        ...f,
        is_safe: Boolean(f.is_safe)
      }))
    });
  } catch (error) {
    console.error('Get foods by category error:', error);
    res.status(500).json({ error: 'Failed to get foods' });
  }
});

// Get all safe foods
foodRouter.get('/safe', (_req: Request, res: Response) => {
  try {
    const foods = db.prepare(`
      SELECT * FROM food_database
      WHERE is_safe = 1
      ORDER BY food_name ASC
    `).all() as FoodItem[];

    res.json({
      foods: foods.map(f => ({
        ...f,
        is_safe: true
      }))
    });
  } catch (error) {
    console.error('Get safe foods error:', error);
    res.status(500).json({ error: 'Failed to get safe foods' });
  }
});

// Get all toxic/dangerous foods
foodRouter.get('/toxic', (_req: Request, res: Response) => {
  try {
    const foods = db.prepare(`
      SELECT * FROM food_database
      WHERE is_safe = 0
      ORDER BY safety_level DESC, food_name ASC
    `).all() as FoodItem[];

    res.json({
      foods: foods.map(f => ({
        ...f,
        is_safe: false
      }))
    });
  } catch (error) {
    console.error('Get toxic foods error:', error);
    res.status(500).json({ error: 'Failed to get toxic foods' });
  }
});

// Get specific food info
foodRouter.get('/:foodName', (req: Request, res: Response) => {
  try {
    const { foodName } = req.params;

    const food = db.prepare(`
      SELECT * FROM food_database
      WHERE LOWER(food_name) = LOWER(?)
    `).get(foodName) as FoodItem | undefined;

    if (!food) {
      res.status(404).json({
        error: 'Food not found in database',
        suggestion: 'Try using the AI assistant for information about this food'
      });
      return;
    }

    res.json({
      food: {
        ...food,
        is_safe: Boolean(food.is_safe)
      }
    });
  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({ error: 'Failed to get food information' });
  }
});

// Get all food categories
foodRouter.get('/categories/list', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category FROM food_database ORDER BY category ASC
    `).all() as { category: string }[];

    res.json({
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Admin: Add new food to database (requires auth)
foodRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      food_name, category, is_safe, safety_level,
      description, benefits, risks, serving_suggestion, sources
    } = req.body;

    if (!food_name || is_safe === undefined || !safety_level) {
      res.status(400).json({ error: 'food_name, is_safe, and safety_level are required' });
      return;
    }

    const id = food_name.toLowerCase().replace(/\s+/g, '-');

    // Check if food already exists
    const existing = db.prepare('SELECT id FROM food_database WHERE id = ?').get(id);
    if (existing) {
      res.status(409).json({ error: 'Food already exists in database' });
      return;
    }

    db.prepare(`
      INSERT INTO food_database (id, food_name, category, is_safe, safety_level, description, benefits, risks, serving_suggestion, sources)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, food_name, category || 'other', is_safe ? 1 : 0, safety_level, description || '', benefits || '', risks || '', serving_suggestion || '', sources || '');

    res.status(201).json({ message: 'Food added to database', id });
  } catch (error) {
    console.error('Add food error:', error);
    res.status(500).json({ error: 'Failed to add food' });
  }
});
