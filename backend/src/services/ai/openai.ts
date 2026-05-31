import OpenAI from 'openai';
import { config } from '../../config';

const client = new OpenAI({ apiKey: config.ai.openai.apiKey });

export async function generateWithOpenAI<T>(prompt: string, systemPrompt: string): Promise<T> {
  const response = await client.chat.completions.create({
    model: config.ai.openai.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');

  return JSON.parse(content) as T;
}
