import { Telegraf, Markup, Scenes, session, Context } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';
import { authTelegram, createProposal, getUserProfile, getUserSubscription, getUserProposals, getProposal, generateDocuments } from './services/api';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

// Extend context
interface SessionData {
  token?: string;
  userId?: string;
  proposalInput?: Record<string, string>;
  step?: number;
  currentProposalId?: string;
}

interface BotContext extends Context {
  session: SessionData;
}

const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN);

// Session middleware
bot.use(session({ defaultSession: () => ({ step: 0, proposalInput: {} }) }));

// ===== Constants =====
const TEMPLATES = [
  ['IT услуги', 'IT'],
  ['Маркетинг', 'MARKETING'],
  ['Дизайн', 'DESIGN'],
  ['Консалтинг', 'CONSULTING'],
  ['Строительство', 'CONSTRUCTION'],
  ['Закупки', 'PROCUREMENT'],
  ['Образование', 'EDUCATION'],
  ['Юридические услуги', 'LEGAL'],
];

const TEMPLATE_LABELS: Record<string, string> = {
  IT: 'IT услуги',
  MARKETING: 'Маркетинг',
  DESIGN: 'Дизайн',
  CONSULTING: 'Консалтинг',
  CONSTRUCTION: 'Строительство',
  PROCUREMENT: 'Закупки',
  EDUCATION: 'Образование',
  LEGAL: 'Юридические услуги',
};

const PROPOSAL_QUESTIONS = [
  { key: 'companyName', question: '🏢 Введите название вашей компании:' },
  { key: 'clientName', question: '👤 Введите имя клиента или название компании клиента:' },
  { key: 'clientBusiness', question: '🏭 Укажите сферу бизнеса клиента:' },
  { key: 'services', question: '📋 Перечислите услуги, которые вы предлагаете:' },
  { key: 'cost', question: '💰 Укажите стоимость услуг:' },
  { key: 'timeline', question: '📅 Укажите сроки выполнения:' },
  { key: 'advantages', question: '⭐ Перечислите основные преимущества вашего предложения:' },
  { key: 'contactInfo', question: '📞 Укажите контактные данные (телефон, email):' },
];

// ===== Commands =====
bot.start(async (ctx) => {
  ctx.session.step = 0;

  const welcomeMessage = `🤖 *Добро пожаловать в AI Commercial Proposal Generator!*

Я помогу вам создать профессиональное коммерческое предложение за 2 минуты.

🚀 *Возможности:*
• Генерация КП с помощью ИИ
• Профессиональный PDF
• Шаблоны под любой бизнес
• Договоры, счета и другие документы

💡 *Начните с создания нового предложения или просмотрите свои тарифы.*`;

  await ctx.replyWithMarkdown(welcomeMessage,
    Markup.inlineKeyboard([
      [Markup.button.callback('📄 Создать КП', 'create_proposal')],
      [Markup.button.callback('📋 Мои КП', 'my_proposals')],
      [Markup.button.callback('💎 Тарифы', 'plans')],
      [Markup.button.callback('👤 Профиль', 'profile')],
    ])
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    'Доступные команды:\n\n' +
    '/start - Главное меню\n' +
    '/new - Создать новое КП\n' +
    '/proposals - Мои предложения\n' +
    '/plan - Мой тариф\n' +
    '/help - Помощь'
  );
});

bot.command('new', async (ctx) => {
  ctx.session.step = 0;
  ctx.session.proposalInput = {};
  await selectTemplate(ctx);
});

bot.command('proposals', async (ctx) => {
  await showMyProposals(ctx);
});

bot.command('plan', async (ctx) => {
  await showPlans(ctx);
});

// ===== Callback handlers =====
bot.action('create_proposal', async (ctx) => {
  ctx.session.step = 0;
  ctx.session.proposalInput = {};
  await ctx.answerCbQuery();
  await selectTemplate(ctx);
});

bot.action('my_proposals', async (ctx) => {
  await ctx.answerCbQuery();
  await showMyProposals(ctx);
});

bot.action('plans', async (ctx) => {
  await ctx.answerCbQuery();
  await showPlans(ctx);
});

bot.action('profile', async (ctx) => {
  await ctx.answerCbQuery();
  await showProfile(ctx);
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.step = 0;
  ctx.session.proposalInput = {};

  await ctx.reply('🏠 *Главное меню*',
    Markup.inlineKeyboard([
      [Markup.button.callback('📄 Создать КП', 'create_proposal')],
      [Markup.button.callback('📋 Мои КП', 'my_proposals')],
      [Markup.button.callback('💎 Тарифы', 'plans')],
      [Markup.button.callback('👤 Профиль', 'profile')],
    ])
  );
});

// Template selection callback
TEMPLATES.forEach(([label, value]) => {
  bot.action(`template_${value}`, async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.proposalInput!['templateType'] = value;
    ctx.session.step = 0;
    await askNextQuestion(ctx);
  });
});

// ===== Proposal Detail & Document Callbacks =====
bot.action(/^vp_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const proposalId = ctx.match[1];
  await showProposalDetail(ctx, proposalId);
});

bot.action(/^pdf_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const proposalId = ctx.match[1];
  await downloadPdf(ctx, proposalId);
});

bot.action(/^(ct|inv|wa|cs|cl)_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const docType = ctx.match[1];
  const proposalId = ctx.match[2];
  await handleGenerateDoc(ctx, proposalId, docType);
});

// ===== Core Functions =====
async function selectTemplate(ctx: BotContext) {
  const buttons = TEMPLATES.map(([label, value]) =>
    [Markup.button.callback(label, `template_${value}`)]
  );
  buttons.push([Markup.button.callback('🔙 Назад', 'main_menu')]);

  await ctx.reply('📁 *Выберите шаблон:*\n\nВыберите сферу бизнеса, подходящую под ваше предложение.',
    Markup.inlineKeyboard(buttons)
  );
}

async function askNextQuestion(ctx: BotContext) {
  const step = ctx.session.step || 0;
  if (step >= PROPOSAL_QUESTIONS.length) {
    await generateProposal(ctx);
    return;
  }

  const q = PROPOSAL_QUESTIONS[step];
  const progress = `▸ Вопрос ${step + 1} из ${PROPOSAL_QUESTIONS.length}`;

  await ctx.reply(`${progress}\n\n${q.question}`, {
    parse_mode: 'Markdown',
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Введите ответ...',
    },
  });
}

bot.on('text', async (ctx) => {
  if (!ctx.session.proposalInput || ctx.session.step === undefined) return;

  const step = ctx.session.step;
  if (step >= PROPOSAL_QUESTIONS.length || step < 0) return;

  const q = PROPOSAL_QUESTIONS[step];
  ctx.session.proposalInput[q.key] = ctx.message.text;
  ctx.session.step = step + 1;

  await askNextQuestion(ctx);
});

async function generateProposal(ctx: BotContext) {
  await ctx.reply('⏳ *Генерация коммерческого предложения...*\n\nИИ анализирует данные и создаёт профессиональный документ. Это займёт около 30 секунд.', {
    parse_mode: 'Markdown',
  });

  try {
    // Auth user by telegram ID
    const from = ctx.from!;
    const auth = await authTelegram(
      String(from.id),
      `${from.first_name} ${from.last_name || ''}`.trim(),
      from.username
    );

    ctx.session.token = auth.token;
    ctx.session.userId = auth.user.id;

    const result = await createProposal(auth.token, ctx.session.proposalInput!);

    await ctx.replyWithMarkdown(
      `✅ *Коммерческое предложение готово!*\n\n` +
      `📄 Клиент: ${result.clientName}\n` +
      `🔖 Шаблон: ${result.templateType}\n` +
      `📅 Создано: ${new Date(result.createdAt).toLocaleDateString('ru-RU')}`
    );

    // Send PDF if available
    if (result.pdfUrl) {
      const pdfUrl = `${process.env.BACKEND_URL || 'http://localhost:4000'}${result.pdfUrl}`;
      await ctx.replyWithDocument(
        { url: pdfUrl, filename: `KP_${result.clientName}.pdf` },
        { caption: '📎 Ваше коммерческое предложение' }
      );
    }

    ctx.session.step = -1;

    // Show post-generation menu
    await ctx.reply('🏠 *Главное меню*',
      Markup.inlineKeyboard([
        [Markup.button.callback('📄 Создать ещё', 'create_proposal')],
        [Markup.button.callback('📋 Детали КП', 'vp_' + result.id)],
        [Markup.button.callback('🏠 На главную', 'main_menu')],
      ])
    );
  } catch (error: any) {
    console.error('Proposal generation error:', error);
    const errorMsg = error.response?.data?.error || 'Произошла ошибка при генерации КП';
    await ctx.reply(`❌ *Ошибка:* ${errorMsg}\n\nПожалуйста, попробуйте ещё раз.`, {
      parse_mode: 'Markdown',
    });
    ctx.session.step = 0;

    await ctx.reply('🏠 *Главное меню*',
      Markup.inlineKeyboard([
        [Markup.button.callback('📄 Создать КП', 'create_proposal')],
        [Markup.button.callback('🏠 На главную', 'main_menu')],
      ])
    );
  }
}

async function showMyProposals(ctx: BotContext) {
  try {
    const from = ctx.from!;
    const auth = await authTelegram(String(from.id));
    ctx.session.token = auth.token;

    const proposals = await getUserProposals(auth.token);

    if (!proposals || proposals.length === 0) {
      await ctx.reply('📋 *У вас пока нет коммерческих предложений.*\n\nСоздайте первое КП!',
        Markup.inlineKeyboard([
          [Markup.button.callback('📄 Создать КП', 'create_proposal')],
          [Markup.button.callback('🏠 На главную', 'main_menu')],
        ])
      );
      return;
    }

    const buttons = proposals.slice(0, 5).map((p: any) => [
      Markup.button.callback(
        `${p.clientName} • ${new Date(p.createdAt).toLocaleDateString('ru-RU')}`,
        `vp_${p.id}`
      ),
    ]);

    buttons.push(
      [Markup.button.callback('📄 Создать КП', 'create_proposal')],
      [Markup.button.callback('🏠 На главную', 'main_menu')]
    );

    await ctx.reply(
      `📋 *Мои коммерческие предложения (${proposals.length})*\n\nВыберите КП для просмотра деталей:`,
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error('Error fetching proposals:', error);
    await ctx.reply('❌ Ошибка при получении списка КП');
  }
}

async function showProposalDetail(ctx: BotContext, proposalId: string) {
  try {
    const from = ctx.from!;
    const auth = ctx.session.token
      ? { token: ctx.session.token }
      : await authTelegram(String(from.id));
    const token = auth.token;
    ctx.session.token = token;

    const proposal = await getProposal(token, proposalId);

    const templateLabel = TEMPLATE_LABELS[proposal.templateType as keyof typeof TEMPLATE_LABELS] || proposal.templateType;

    let message =
      '📄 *' + proposal.clientName + '*\n' +
      '━━━━━━━━━━━━━━━━━\n' +
      '🏭 Компания: ' + (proposal.clientCompany || 'Не указано') + '\n' +
      '🔖 Шаблон: ' + templateLabel + '\n' +
      '📅 Создано: ' + new Date(proposal.createdAt).toLocaleDateString('ru-RU') + '\n' +
      '📊 Статус: ' + proposal.status + '\n\n' +
      '*Действия:*';

    const buttons: any[][] = [];

    if (proposal.pdfUrl) {
      buttons.push([Markup.button.callback('📄 Скачать PDF', 'pdf_' + proposal.id)]);
    }

    buttons.push(
      [Markup.button.callback('📝 Договор', 'ct_' + proposal.id), Markup.button.callback('🧾 Счёт', 'inv_' + proposal.id)],
      [Markup.button.callback('💬 WhatsApp', 'wa_' + proposal.id), Markup.button.callback('🎯 Скрипт звонка', 'cs_' + proposal.id)],
      [Markup.button.callback('✉️ Ком. письмо', 'cl_' + proposal.id)],
      [Markup.button.callback('🔙 К списку', 'my_proposals')],
    );

    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Proposal detail error:', error);
    await ctx.reply('❌ Ошибка при получении деталей КП');
  }
}

async function downloadPdf(ctx: BotContext, proposalId: string) {
  try {
    const from = ctx.from!;
    const auth = ctx.session.token
      ? { token: ctx.session.token }
      : await authTelegram(String(from.id));
    const token = auth.token;

    const proposal = await getProposal(token, proposalId);

    if (!proposal.pdfUrl) {
      await ctx.reply('❌ PDF для этого КП не найден');
      return;
    }

    const pdfUrl = (process.env.BACKEND_URL || 'http://localhost:4000') + proposal.pdfUrl;
    await ctx.replyWithDocument(
      { url: pdfUrl, filename: 'KP_' + proposal.clientName + '.pdf' },
      { caption: '📎 Ваше коммерческое предложение' }
    );
  } catch (error) {
    console.error('PDF download error:', error);
    await ctx.reply('❌ Ошибка при загрузке PDF');
  }
}

async function handleGenerateDoc(ctx: BotContext, proposalId: string, docType: string) {
  try {
    const from = ctx.from!;
    const auth = ctx.session.token
      ? { token: ctx.session.token }
      : await authTelegram(String(from.id));
    const token = auth.token;
    ctx.session.token = token;

    const typeLabels: Record<string, string> = {
      ct: 'договора',
      inv: 'счёта',
      wa: 'WhatsApp сообщения',
      cs: 'скрипта звонка',
      cl: 'коммерческого письма',
    };

    const apiTypes: Record<string, string> = {
      ct: 'contract',
      inv: 'invoice',
      wa: 'whatsapp',
      cs: 'call_script',
      cl: 'commercial_letter',
    };

    const label = typeLabels[docType] || 'документа';
    await ctx.reply('⏳ *Генерация ' + label + '...*', { parse_mode: 'Markdown' });

    const result = await generateDocuments(token, proposalId, [apiTypes[docType]]);

    const docData = result[apiTypes[docType]]?.content || result[apiTypes[docType]];
    if (!docData) {
      await ctx.reply('❌ Не удалось сгенерировать документ');
      return;
    }

    let response: string;
    switch (docType) {
      case 'ct': {
        const c = docData as any;
        const termsStr = (c.terms || []).map((t: string) => '• ' + t).join('\n');
        response =
          '📝 *Договор*\n━━━━━━━━━━━━━━━━━\n*' + (c.title || 'Договор') + '*\n\n' + (c.content || '') + '\n\n' +
          '*Условия:*\n' + termsStr + '\n\n' +
          '*Стороны:*\n👤 Исполнитель: ' + (c.parties?.contractor || '-') + '\n👤 Клиент: ' + (c.parties?.client || '-');
        break;
      }
      case 'inv': {
        const inv = docData as any;
        const itemsStr = (inv.items || []).map((i: any) => '• ' + i.name + ' — ' + (i.price || '-')).join('\n');
        response =
          '🧾 *Счёт №' + (inv.invoiceNumber || '—') + '*\n━━━━━━━━━━━━━━━━━\n📅 Дата: ' + (inv.date || '-') + '\n\n' +
          '*Услуги:*\n' + (itemsStr || '—') + '\n\n*Итого:* ' + (inv.total || '-') + '\n\n' +
          '*Реквизиты:* ' + (inv.companyDetails || '-') + '\n👤 Клиент: ' + (inv.clientDetails || '-');
        break;
      }
      case 'wa': {
        response = '💬 *WhatsApp сообщение*\n━━━━━━━━━━━━━━━━━\n\n' + (docData.text || docData);
        break;
      }
      case 'cs': {
        const s = docData as any;
        const sectionsStr = (s.sections || []).map((sec: any) => '*' + sec.title + '*\n' + sec.content).join('\n\n');
        response = '🎯 *Скрипт звонка*\n━━━━━━━━━━━━━━━━━\n\n' + sectionsStr + (s.script ? '\n\n---\n' + s.script : '');
        break;
      }
      case 'cl': {
        const text = typeof docData === 'string' ? docData : (docData.text || JSON.stringify(docData));
        response = '✉️ *Коммерческое письмо*\n━━━━━━━━━━━━━━━━━\n\n' + text;
        break;
      }
      default:
        response = '❌ Неизвестный тип документа';
    }

    await ctx.replyWithMarkdown(response);
  } catch (error: any) {
    console.error('Document generation error:', error);
    const errorMsg = error.response?.data?.error || 'Произошла ошибка при генерации документа';
    await ctx.reply('❌ *Ошибка:* ' + errorMsg, { parse_mode: 'Markdown' });
  }
}

async function showPlans(ctx: BotContext) {
  const message =
    `💎 *Тарифы*\n\n` +
    `*Бесплатный* — 0 ₸\n` +
    `• 3 коммерческих предложения\n` +
    `• Базовые шаблоны\n` +
    `• PDF экспорт\n\n` +
    `*Start* — 3 000 ₸/мес\n` +
    `• 30 коммерческих предложений\n` +
    `• Все шаблоны\n` +
    `• Загрузка логотипа\n` +
    `• Генерация договора и счета\n\n` +
    `*Business* — 10 000 ₸/мес\n` +
    `• Безлимитные КП\n` +
    `• Все шаблоны\n` +
    `• Все доп. документы\n` +
    `• API доступ\n` +
    `• Приоритетная поддержка\n\n` +
    `*Enterprise* — Индивидуально\n` +
    `• White-label\n` +
    `• Своя AI модель\n` +
    `• Персональный менеджер`;

  await ctx.replyWithMarkdown(message,
    Markup.inlineKeyboard([
      [Markup.button.url('🚀 Перейти на сайте', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings`)],
      [Markup.button.callback('🏠 На главную', 'main_menu')],
    ])
  );
}

async function showProfile(ctx: BotContext) {
  try {
    const from = ctx.from!;
    const auth = await authTelegram(String(from.id));

    const profile = await getUserProfile(auth.token);
    const sub = await getUserSubscription(auth.token);

    const message =
      `👤 *Профиль*\n\n` +
      `Имя: ${profile.name || 'Не указано'}\n` +
      `Компания: ${profile.companyName || 'Не указано'}\n` +
      `Telegram ID: ${profile.telegramId || 'Не привязан'}\n\n` +
      `💎 *Тариф:* ${sub.plan?.name || 'Free'}\n` +
      `📊 Использовано: ${sub.proposalsUsed} из ${sub.proposalsLimit === -1 ? '∞' : sub.proposalsLimit} КП`;

    await ctx.replyWithMarkdown(message,
      Markup.inlineKeyboard([
        [Markup.button.callback('💎 Тарифы', 'plans')],
        [Markup.button.callback('🏠 На главную', 'main_menu')],
      ])
    );
  } catch (error) {
    console.error('Profile error:', error);
    await ctx.reply('❌ Ошибка при получении профиля');
  }
}

// ===== Start =====
bot.launch().then(() => {
  console.log('🤖 Telegram bot started');
}).catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
