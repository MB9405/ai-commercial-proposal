import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:4000',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    primaryProvider: (process.env.AI_PRIMARY_PROVIDER || 'deepseek') as 'openai' | 'deepseek' | 'gemini',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'gemini-1.5-flash',
    },
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_BOT_WEBHOOK_URL || '',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/commercial_proposal',
  },
};
