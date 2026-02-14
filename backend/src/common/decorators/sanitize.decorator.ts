/**
 * VaxTrace Nigeria - Input Sanitization Decorators
 *
 * Provides decorators for sanitizing user input to prevent:
 * - SQL Injection
 * - Cross-Site Scripting (XSS)
 * - NoScript Injection
 * - HTML Injection
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { Transform, TransformationType } from 'class-transformer';

/**
 * Sanitizes string input by removing potentially dangerous characters
 * - Removes SQL injection patterns
 * - Removes XSS patterns
 * - Removes HTML tags
 * - Removes NoScript tags
 */
export function sanitizeInput(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove SQL injection patterns
  let sanitized = value.replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)/gi, '');
  
  // Remove SQL comment patterns
  sanitized = sanitized.replace(/(--)|(#)|(\/\*)|(\*\/)|(;)/g, '');
  
  // Remove XSS patterns - script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove other potentially dangerous HTML tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');
  
  // Remove on* event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (except for images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
  
  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '');
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Custom decorator for sanitizing string properties
 */
export function IsSanitized(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSanitized',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          // Sanitization happens in transform decorator
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially dangerous content`;
        },
      },
    });
  };
}

/**
 * Transform decorator that sanitizes input
 */
export function Sanitize() {
  return Transform(({ value }) => sanitizeInput(value));
}

/**
 * Combined decorator for sanitization and validation
 */
export function SanitizedString(validationOptions?: ValidationOptions) {
  return function (target: any, key: string) {
    Sanitize()(target, key);
    IsSanitized(validationOptions)(target, key);
  };
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Lowercase and trim
  let sanitized = value.toLowerCase().trim();
  
  // Remove any potentially dangerous characters
  sanitized = sanitized.replace(/[<>"'()&+]/g, '');
  
  return sanitized;
}

/**
 * Transform decorator for email sanitization
 */
export function SanitizeEmail() {
  return Transform(({ value }) => sanitizeEmail(value));
}

/**
 * Sanitizes UUID strings
 */
export function sanitizeUUID(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove any non-UUID characters
  return value.replace(/[^0-9a-fA-F-]/g, '');
}

/**
 * Transform decorator for UUID sanitization
 */
export function SanitizeUUID() {
  return Transform(({ value }) => sanitizeUUID(value));
}

/**
 * Sanitizes numeric input
 */
export function sanitizeNumber(value: any): any {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove any non-numeric characters except decimal point and minus sign
    const sanitized = value.replace(/[^\d.-]/g, '');
    const num = parseFloat(sanitized);
    return isNaN(num) ? value : num;
  }
  
  return value;
}

/**
 * Transform decorator for number sanitization
 */
export function SanitizeNumber() {
  return Transform(({ value }) => sanitizeNumber(value));
}

/**
 * Sanitizes array input
 */
export function sanitizeArray(value: any): any {
  if (!Array.isArray(value)) {
    return value;
  }
  
  return value.map(item => sanitizeInput(item));
}

/**
 * Transform decorator for array sanitization
 */
export function SanitizeArray() {
  return Transform(({ value }) => sanitizeArray(value));
}
