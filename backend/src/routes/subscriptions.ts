import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PlanType, PLANS } from 'shared';

const router = Router();

router.get('/plans', async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: Object.entries(PLANS).map(([key, plan]) => ({ id: key, ...plan })) });
});

router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        planType: true, proposalsUsed: true, proposalsLimit: true,
        subscription: true,
      },
    });

    const plan = PLANS[user?.planType as PlanType] || PLANS.FREE;
    const planInfo = { id: user?.planType, ...plan };

    res.json({
      success: true,
      data: {
        plan: planInfo,
        proposalsUsed: user?.proposalsUsed || 0,
        proposalsLimit: user?.proposalsLimit || 3,
        subscription: user?.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения подписки' });
  }
});

router.post('/upgrade', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { planType } = req.body as { planType: PlanType };

    if (!Object.values(PlanType).includes(planType)) {
      return res.status(400).json({ success: false, error: 'Неверный тариф' });
    }

    const plan = PLANS[planType];
    if (!plan || plan.name === 'Enterprise') {
      return res.status(400).json({ success: false, error: 'Свяжитесь с отделом продаж' });
    }

    // In production, integrate with payment system (KASPI, etc.)
    // For MVP, we upgrade directly
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        planType,
        proposalsLimit: plan.proposalsLimit,
      },
    });

    await prisma.subscription.upsert({
      where: { userId: req.userId! },
      update: { planType, status: 'ACTIVE' },
      create: { userId: req.userId!, planType, status: 'ACTIVE' },
    });

    res.json({
      success: true,
      data: {
        planType: user.planType,
        proposalsLimit: user.proposalsLimit,
        message: `Тариф ${plan.name} активирован`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка обновления тарифа' });
  }
});

export default router;
