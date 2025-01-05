export interface GenericResponse<T> {
  status: string; // "success" or "error"
  message: string;
  data?: T; // Present in successful responses
  errors?: Array<{ field?: string; message: string }>; // Present in error responses
}
