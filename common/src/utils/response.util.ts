import { GenericResponse } from 'src/types/response.type';

export function createResponse<T>(
  status: 'success' | 'error',
  message: string,
  data?: T,
  errors?: Array<{ field?: string; message: string }>,
): GenericResponse<T> {
  return { status, message, data, errors };
}
