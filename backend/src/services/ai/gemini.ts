import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';

const genAI = new GoogleGenerativeAI(config.ai.gemini.apiKey);

export async function generateWithGemini<T>(prompt: string, systemPrompt: string): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: config.ai.gemini.model,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: prompt },
  ]);

  const response = result.response;
  const content = response.text();
  if (!content) throw new Error('Gemini returned empty response');

  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}
