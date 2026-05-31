import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number, currency = 'KZT') {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
