import { franc } from 'franc';

export function detectLanguage(message: string): string {
  const code = franc(message, {
    minLength: 3,
  });

  if (code === 'und') {
    return 'eng';
  }

  return code;
}
