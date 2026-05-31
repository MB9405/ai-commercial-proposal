import OpenAI from 'openai';
import { config } from '../../config';

const client = new OpenAI({
  apiKey: config.ai.deepseek.apiKey,
  baseURL: config.ai.deepseek.baseUrl,
});

export async function generateWithDeepSeek<T>(prompt: string, systemPrompt: string): Promise<T> {
  const response = await client.chat.completions.create({
    model: config.ai.deepseek.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('DeepSeek returned empty response');

  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}
