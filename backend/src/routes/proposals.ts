import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, checkProposalLimit, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateProposal, generateContract, generateInvoice, generateWhatsAppMessage, generateCallScript, generateCommercialLetter } from '../services/ai';
import { generateProposalPDF } from '../services/pdf';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { TemplateType } from 'shared';

const router = Router();

const createProposalSchema = z.object({
  companyName: z.string().min(1, 'Название компании обязательно'),
  clientName: z.string().min(1, 'Имя клиента обязательно'),
  clientBusiness: z.string().min(1, 'Сфера бизнеса обязательна'),
  services: z.string().min(1, 'Услуги обязательны'),
  cost: z.string().min(1, 'Стоимость обязательна'),
  timeline: z.string().min(1, 'Сроки обязательны'),
  advantages: z.string().min(1, 'Преимущества обязательны'),
  contactInfo: z.string().min(1, 'Контактные данные обязательны'),
  templateType: z.nativeEnum(TemplateType).default(TemplateType.IT),
  brandColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

const generateDocsSchema = z.object({
  proposalId: z.string().uuid(),
  types: z.array(z.enum(['contract', 'invoice', 'whatsapp', 'call_script', 'commercial_letter'])),
});

// Create proposal
router.post('/', authenticate, checkProposalLimit, validate(createProposalSchema), async (req: AuthRequest, res: Response) => {
  try {
    const input = req.body;
    const userId = req.userId!;
    const brandColor = input.brandColor || '#2563EB';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { logoUrl: true, companyName: true },
    });

    // Generate proposal with AI
    const generatedData = await generateProposal(input);

    // Save to DB
    const proposal = await prisma.proposal.create({
      data: {
        userId,
        clientName: input.clientName,
        clientCompany: input.clientBusiness,
        templateType: input.templateType,
        inputData: input,
        generatedData: generatedData as Record<string, unknown>,
      },
    });

    // Generate PDF
    const pdfDir = path.join(config.upload.dir, 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, `${proposal.id}.pdf`);
    const logoPath = user?.logoUrl ? path.join(config.upload.dir, user.logoUrl) : undefined;

    await generateProposalPDF(generatedData, {
      logoPath: logoPath && fs.existsSync(logoPath) ? logoPath : undefined,
      brandColor,
      outputPath: pdfPath,
    });

    // Update proposal with PDF URL
    const pdfUrl = `/uploads/pdfs/${proposal.id}.pdf`;
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { pdfUrl },
    });

    // Increment usage
    await prisma.user.update({
      where: { id: userId },
      data: { proposalsUsed: { increment: 1 } },
    });

    res.status(201).json({
      success: true,
      data: {
        id: proposal.id,
        clientName: proposal.clientName,
        templateType: proposal.templateType,
        pdfUrl,
        createdAt: proposal.createdAt,
      },
    });
  } catch (error) {
    console.error('Proposal creation error:', error);
    res.status(500).json({ success: false, error: 'Ошибка генерации коммерческого предложения' });
  }
});

// List user proposals
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, clientName: true, clientCompany: true,
          templateType: true, status: true, pdfUrl: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.proposal.count({ where: { userId: req.userId } }),
    ]);

    res.json({
      success: true,
      data: proposals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения списка КП' });
  }
});

// Get single proposal
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { documents: true },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'КП не найдено' });
    }

    res.json({ success: true, data: proposal });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения КП' });
  }
});

// Delete proposal
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'КП не найдено' });
    }

    // Delete PDF file
    if (proposal.pdfUrl) {
      const pdfPath = path.join(config.upload.dir, 'pdfs', `${proposal.id}.pdf`);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }

    await prisma.generatedDocument.deleteMany({ where: { proposalId: proposal.id } });
    await prisma.proposal.delete({ where: { id: proposal.id } });

    res.json({ success: true, message: 'КП удалено' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка удаления КП' });
  }
});

// Generate additional documents
router.post('/documents', authenticate, validate(generateDocsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { proposalId, types } = req.body;

    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, userId: req.userId },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'КП не найдено' });
    }

    const input = proposal.inputData as Record<string, string>;
    const generatedData = proposal.generatedData as Record<string, unknown>;
    // We'd parse them into proper types; simplified for brevity

    const results: Record<string, unknown> = {};

    for (const type of types) {
      switch (type) {
        case 'contract': {
          const contract = await generateContract(
            generatedData as any,
            input as any
          );
          const doc = await prisma.generatedDocument.create({
            data: {
              proposalId,
              documentType: 'CONTRACT',
              content: contract as Record<string, unknown>,
            },
          });
          results.contract = { id: doc.id, content: contract };
          break;
        }
        case 'invoice': {
          const invoice = await generateInvoice(
            generatedData as any,
            input as any
          );
          const doc = await prisma.generatedDocument.create({
            data: {
              proposalId,
              documentType: 'INVOICE',
              content: invoice as Record<string, unknown>,
            },
          });
          results.invoice = { id: doc.id, content: invoice };
          break;
        }
        case 'whatsapp': {
          const msg = await generateWhatsAppMessage(
            generatedData as any,
            input as any
          );
          const doc = await prisma.generatedDocument.create({
            data: {
              proposalId,
              documentType: 'WHATSAPP_MESSAGE',
              content: msg as Record<string, unknown>,
            },
          });
          results.whatsapp = { id: doc.id, content: msg.text };
          break;
        }
        case 'call_script': {
          const script = await generateCallScript(
            generatedData as any,
            input as any
          );
          const doc = await prisma.generatedDocument.create({
            data: {
              proposalId,
              documentType: 'CALL_SCRIPT',
              content: script as Record<string, unknown>,
            },
          });
          results.callScript = { id: doc.id, content: script };
          break;
        }
        case 'commercial_letter': {
          const letter = await generateCommercialLetter(
            generatedData as any,
            input as any
          );
          const doc = await prisma.generatedDocument.create({
            data: {
              proposalId,
              documentType: 'COMMERCIAL_LETTER',
              content: { text: letter },
            },
          });
          results.commercialLetter = { id: doc.id, content: letter };
          break;
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ success: false, error: 'Ошибка генерации документов' });
  }
});

export default router;
