import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения шаблонов' });
  }
});

export default router;
