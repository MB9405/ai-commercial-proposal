import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть минимум 6 символов'),
  name: z.string().min(2, 'Имя должно быть минимум 2 символа'),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name, companyName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email уже зарегистрирован' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, companyName },
    });

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          planType: user.planType,
          proposalsUsed: user.proposalsUsed,
          proposalsLimit: user.proposalsLimit,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Ошибка регистрации' });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          planType: user.planType,
          proposalsUsed: user.proposalsUsed,
          proposalsLimit: user.proposalsLimit,
          logoUrl: user.logoUrl,
          brandColor: user.brandColor,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Ошибка входа' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, name: true, companyName: true,
        planType: true, proposalsUsed: true, proposalsLimit: true,
        logoUrl: true, brandColor: true, phone: true, telegramId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения профиля' });
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, companyName, phone, brandColor } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, companyName, phone, brandColor },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка обновления профиля' });
  }
});

// Telegram auth
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { telegramId, name, username } = req.body;

    let user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          name: name || username || 'Telegram User',
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id, name: user.name, planType: user.planType,
          proposalsUsed: user.proposalsUsed, proposalsLimit: user.proposalsLimit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка авторизации через Telegram' });
  }
});

export default router;
