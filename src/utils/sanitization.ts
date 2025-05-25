
import DOMPurify from 'dompurify';

// Configure DOMPurify with secure defaults
DOMPurify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: false
});

// Sanitize HTML content
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html);
}

// Sanitize plain text (remove HTML tags completely)
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Sanitize object fields recursively
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj } as T;
  
  Object.keys(result).forEach(key => {
    const value = result[key as keyof T];
    
    if (typeof value === 'string') {
      (result as any)[key] = sanitizeHTML(value);
    } else if (Array.isArray(value)) {
      (result as any)[key] = value.map(item => 
        typeof item === 'string' ? sanitizeHTML(item) : 
        typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      (result as any)[key] = sanitizeObject(value);
    }
  });
  
  return result;
}

// Sanitize form data before submission
export function sanitizeFormData<T extends Record<string, any>>(formData: T): T {
  return sanitizeObject(formData);
}

// SQL injection prevention - escape special characters
export function escapeSQLString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Note: This is for additional safety. Supabase uses parameterized queries
  // which already prevent SQL injection, but this adds an extra layer
  return input.replace(/['";\\]/g, '\\$&');
}

// Validate and sanitize URL inputs
export function sanitizeURL(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return urlObj.toString();
  } catch {
    return '';
  }
}
