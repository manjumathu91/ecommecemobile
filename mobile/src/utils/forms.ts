import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/client';

/** Maps backend field errors ({"email": "already exists"}) onto react-hook-form fields.
 *  Returns true when at least one field was matched; otherwise the caller shows the general message. */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>, known: string[]): boolean {
  if (!(e instanceof ApiError)) return false;
  let matched = false;
  for (const [field, message] of Object.entries(e.fields)) {
    if (known.includes(field)) {
      setError(field as Path<T>, { message });
      matched = true;
    }
  }
  return matched;
}

export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') => (e instanceof Error ? e.message : fallback);
