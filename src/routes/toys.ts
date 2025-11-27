import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/init.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const toysRouter = Router();

// Apply auth to all routes
toysRouter.use(authenticateToken);

// Get all toys/supplies for user's dogs
toysRouter.get('/', (req: AuthRequest, res: Response) => {
  try {
    const toys = db.prepare(`
      SELECT t.*, d.name as dog_name FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE d.user_id = ?
      ORDER BY t.name ASC
    `).all(req.userId);

    res.json({ toys });
  } catch (error) {
    console.error('Get toys error:', error);
    res.status(500).json({ error: 'Failed to get toys' });
  }
});

// Get toys for specific dog
toysRouter.get('/dog/:dogId', (req: AuthRequest, res: Response) => {
  try {
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(req.params.dogId, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const toys = db.prepare(`
      SELECT * FROM toys WHERE dog_id = ?
      ORDER BY category, name ASC
    `).all(req.params.dogId);

    // Group by category
    const grouped: Record<string, unknown[]> = {};
    for (const toy of toys as { category: string }[]) {
      if (!grouped[toy.category]) {
        grouped[toy.category] = [];
      }
      grouped[toy.category].push(toy);
    }

    res.json({ toys, grouped });
  } catch (error) {
    console.error('Get dog toys error:', error);
    res.status(500).json({ error: 'Failed to get toys' });
  }
});

// Get toys by category
toysRouter.get('/category/:category', (req: AuthRequest, res: Response) => {
  try {
    const toys = db.prepare(`
      SELECT t.*, d.name as dog_name FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE d.user_id = ? AND t.category = ?
      ORDER BY t.name ASC
    `).all(req.userId, req.params.category);

    res.json({ category: req.params.category, toys });
  } catch (error) {
    console.error('Get toys by category error:', error);
    res.status(500).json({ error: 'Failed to get toys' });
  }
});

// Get favorite toys
toysRouter.get('/favorites', (req: AuthRequest, res: Response) => {
  try {
    const favorites = db.prepare(`
      SELECT t.*, d.name as dog_name FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE d.user_id = ? AND t.is_favorite = 1
      ORDER BY t.name ASC
    `).all(req.userId);

    res.json({ favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Get items needing replacement
toysRouter.get('/needs-replacement', (req: AuthRequest, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT t.*, d.name as dog_name FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE d.user_id = ? AND t.condition IN ('worn', 'needs_replacement')
      ORDER BY t.condition DESC, t.name ASC
    `).all(req.userId);

    res.json({ items });
  } catch (error) {
    console.error('Get items needing replacement error:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
});

// Add toy/supply
toysRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const {
      dog_id, name, category, brand, purchase_date,
      purchase_price, condition, is_favorite, notes, photo_url
    } = req.body;

    if (!dog_id || !name) {
      res.status(400).json({ error: 'dog_id and name are required' });
      return;
    }

    // Verify dog belongs to user
    const dog = db.prepare('SELECT * FROM dogs WHERE id = ? AND user_id = ?')
      .get(dog_id, req.userId);

    if (!dog) {
      res.status(404).json({ error: 'Dog not found' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO toys (id, dog_id, name, category, brand, purchase_date, purchase_price, condition, is_favorite, notes, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, dog_id, name, category || 'toy', brand || null,
      purchase_date || null, purchase_price || null, condition || 'new',
      is_favorite ? 1 : 0, notes || null, photo_url || null
    );

    const toy = db.prepare('SELECT * FROM toys WHERE id = ?').get(id);
    res.status(201).json({ message: 'Item added', toy });
  } catch (error) {
    console.error('Add toy error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update toy
toysRouter.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const toy = db.prepare(`
      SELECT t.* FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE t.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!toy) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const {
      name, category, brand, purchase_date,
      purchase_price, condition, is_favorite, notes, photo_url
    } = req.body;

    db.prepare(`
      UPDATE toys SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        brand = COALESCE(?, brand),
        purchase_date = COALESCE(?, purchase_date),
        purchase_price = COALESCE(?, purchase_price),
        condition = COALESCE(?, condition),
        is_favorite = COALESCE(?, is_favorite),
        notes = COALESCE(?, notes),
        photo_url = COALESCE(?, photo_url)
      WHERE id = ?
    `).run(
      name, category, brand, purchase_date, purchase_price,
      condition, is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
      notes, photo_url, req.params.id
    );

    const updated = db.prepare('SELECT * FROM toys WHERE id = ?').get(req.params.id);
    res.json({ message: 'Item updated', toy: updated });
  } catch (error) {
    console.error('Update toy error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete toy
toysRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const toy = db.prepare(`
      SELECT t.* FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE t.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId);

    if (!toy) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    db.prepare('DELETE FROM toys WHERE id = ?').run(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete toy error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Toggle favorite status
toysRouter.post('/:id/favorite', (req: AuthRequest, res: Response) => {
  try {
    const toy = db.prepare(`
      SELECT t.* FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE t.id = ? AND d.user_id = ?
    `).get(req.params.id, req.userId) as { is_favorite: number } | undefined;

    if (!toy) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const newFavoriteStatus = toy.is_favorite ? 0 : 1;
    db.prepare('UPDATE toys SET is_favorite = ? WHERE id = ?')
      .run(newFavoriteStatus, req.params.id);

    res.json({ message: newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites', is_favorite: Boolean(newFavoriteStatus) });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Failed to update favorite status' });
  }
});

// Get spending summary
toysRouter.get('/spending-summary', (req: AuthRequest, res: Response) => {
  try {
    const summary = db.prepare(`
      SELECT
        t.category,
        COUNT(*) as item_count,
        SUM(t.purchase_price) as total_spent
      FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE d.user_id = ? AND t.purchase_price IS NOT NULL
      GROUP BY t.category
    `).all(req.userId);

    const total = db.prepare(`
      SELECT SUM(t.purchase_price) as grand_total
      FROM toys t
      JOIN dogs d ON t.dog_id = d.id
      WHERE d.user_id = ? AND t.purchase_price IS NOT NULL
    `).get(req.userId) as { grand_total: number | null };

    res.json({
      by_category: summary,
      grand_total: total?.grand_total || 0
    });
  } catch (error) {
    console.error('Get spending summary error:', error);
    res.status(500).json({ error: 'Failed to get spending summary' });
  }
});
