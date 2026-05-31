import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    planType: string;
    proposalsUsed: number;
    proposalsLimit: number;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, planType: true, proposalsUsed: true, proposalsLimit: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Пользователь не найден' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

export const checkProposalLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Не авторизован' });

  if (user.proposalsLimit !== -1 && user.proposalsUsed >= user.proposalsLimit) {
    return res.status(403).json({
      success: false,
      error: 'Лимит КП исчерпан. Обновите тариф.',
      code: 'LIMIT_EXCEEDED',
    });
  }

  next();
};
