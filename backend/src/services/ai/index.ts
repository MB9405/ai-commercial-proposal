import { config } from '../../config';
import { generateWithOpenAI } from './openai';
import { generateWithDeepSeek } from './deepseek';
import { generateWithGemini } from './gemini';
import { ProposalInput, GeneratedProposal, GeneratedContract, GeneratedInvoice, WhatsAppMessage, CallScript } from 'shared';

type GenerateFunction<T> = (prompt: string, systemPrompt: string) => Promise<T>;

async function generateWithProvider<T>(prompt: string, systemPrompt: string): Promise<T> {
  const provider = config.ai.primaryProvider;

  let generateFn: GenerateFunction<T>;

  switch (provider) {
    case 'openai':
      generateFn = generateWithOpenAI as GenerateFunction<T>;
      break;
    case 'gemini':
      generateFn = generateWithGemini as GenerateFunction<T>;
      break;
    case 'deepseek':
    default:
      generateFn = generateWithDeepSeek as GenerateFunction<T>;
      break;
  }

  return generateFn(prompt, systemPrompt);
}

export async function generateProposal(input: ProposalInput): Promise<GeneratedProposal> {
  const systemPrompt = `Ты — профессиональный копирайтер и эксперт по созданию коммерческих предложений.
Создай продающее коммерческое предложение на русском языке.
Используй деловой, современный и убедительный стиль.
Без воды, только факты и выгоды для клиента.
Формат ответа: строгий JSON без markdown-разметки.`;

  const userPrompt = `Создай коммерческое предложение на основе следующих данных:
- Название компании: ${input.companyName}
- Имя клиента: ${input.clientName}
- Сфера бизнеса клиента: ${input.clientBusiness}
- Предлагаемые услуги: ${input.services}
- Стоимость: ${input.cost}
- Сроки выполнения: ${input.timeline}
- Основные преимущества: ${input.advantages}
- Контактные данные: ${input.contactInfo}
- Шаблон: ${input.templateType}

Сгенерируй JSON со следующей структурой:
{
  "title": "строка",
  "coverPage": { "title": "строка", "subtitle": "строка", "date": "строка", "companyName": "строка", "clientName": "строка" },
  "greeting": "строка",
  "problemAnalysis": "строка",
  "solution": "строка",
  "advantages": ["строка", "строка", ...],
  "servicesOffered": [{ "name": "строка", "description": "строка", "price": "строка" }],
  "pricing": { "total": "строка", "items": [{ "name": "строка", "description": "строка", "price": "строка" }], "notes": "строка" },
  "timeline": { "totalDuration": "строка", "phases": [{ "name": "строка", "duration": "строка", "description": "строка" }] },
  "caseStudies": [{ "title": "строка", "description": "строка", "result": "строка" }],
  "contactSection": { "companyName": "строка", "contactInfo": "строка", "phone": "строка", "email": "строка", "website": "строка" },
  "conclusion": "строка"
}`;

  return generateWithProvider<GeneratedProposal>(userPrompt, systemPrompt);
}

export async function generateContract(proposal: GeneratedProposal, input: ProposalInput): Promise<GeneratedContract> {
  const systemPrompt = 'Ты — юрист. Составь договор на оказание услуг на русском языке. Формат JSON.';
  const userPrompt = `Составь договор на основе:\nКомпания: ${input.companyName}\nКлиент: ${input.clientName}\nУслуги: ${input.services}\nСтоимость: ${input.cost}`;

  return generateWithProvider<GeneratedContract>(userPrompt, systemPrompt);
}

export async function generateInvoice(proposal: GeneratedProposal, input: ProposalInput): Promise<GeneratedInvoice> {
  const systemPrompt = 'Ты — бухгалтер. Создай счет на оплату. Формат JSON.';
  const userPrompt = `Создай счет:\nКомпания: ${input.companyName}\nКлиент: ${input.clientName}\nУслуги: ${input.services}\nСтоимость: ${input.cost}`;

  return generateWithProvider<GeneratedInvoice>(userPrompt, systemPrompt);
}

export async function generateWhatsAppMessage(proposal: GeneratedProposal, input: ProposalInput): Promise<WhatsAppMessage> {
  const systemPrompt = 'Ты — менеджер по продажам. Напиши сообщение для WhatsApp клиенту. Формат JSON: {"text": "..."}';
  const userPrompt = `Напиши сообщение для отправки коммерческого предложения:\nКлиент: ${input.clientName}\nКомпания: ${input.companyName}`;

  return generateWithProvider<WhatsAppMessage>(userPrompt, systemPrompt);
}

export async function generateCallScript(proposal: GeneratedProposal, input: ProposalInput): Promise<CallScript> {
  const systemPrompt = 'Ты — тренер по продажам. Создай скрипт звонка клиенту. Формат JSON.';
  const userPrompt = `Создай скрипт звонка:\nКлиент: ${input.clientName}\nКомпания: ${input.companyName}\nУслуги: ${input.services}`;

  return generateWithProvider<CallScript>(userPrompt, systemPrompt);
}

export async function generateCommercialLetter(proposal: GeneratedProposal, input: ProposalInput): Promise<string> {
  const systemPrompt = 'Ты — копирайтер. Напиши коммерческое письмо. Формат JSON: {"text": "..."}';
  const userPrompt = `Напиши коммерческое письмо для:\nКомпания: ${input.companyName}\nКлиент: ${input.clientName}\nУслуги: ${input.services}`;

  const result = await generateWithProvider<{ text: string }>(userPrompt, systemPrompt);
  return result.text;
}
