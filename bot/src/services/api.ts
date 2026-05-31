import axios from 'axios';

const API_URL = process.env.BACKEND_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL: API_URL });

export async function authTelegram(telegramId: string, name?: string, username?: string) {
  const { data } = await api.post('/auth/telegram', { telegramId, name, username });
  return data.data;
}

export async function createProposal(token: string, input: Record<string, string>) {
  const { data } = await api.post('/proposals', input, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

export async function getUserProfile(token: string) {
  const { data } = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

export async function getUserSubscription(token: string) {
  const { data } = await api.get('/subscriptions/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

export async function getUserProposals(token: string) {
  const { data } = await api.get('/proposals?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

export async function getProposal(token: string, id: string) {
  const { data } = await api.get(`/proposals/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

export async function generateDocuments(token: string, proposalId: string, types: string[]) {
  const { data } = await api.post('/proposals/documents', { proposalId, types }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}
