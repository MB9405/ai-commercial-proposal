import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

router.post('/logo', authenticate, upload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await prisma.user.update({
      where: { id: req.userId },
      data: { logoUrl },
    });

    res.json({ success: true, data: { logoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка загрузки логотипа' });
  }
});

export default router;
