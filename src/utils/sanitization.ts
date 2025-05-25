
import DOMPurify from 'dompurify';

export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data } as T;
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key as keyof T];
    if (typeof value === 'string') {
      // Sanitize HTML content and trim whitespace
      (sanitized as any)[key] = DOMPurify.sanitize(value.trim());
    }
  });
  
  return sanitized;
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}
