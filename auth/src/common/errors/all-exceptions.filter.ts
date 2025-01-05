import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If it's an HttpException (including BadRequestException)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Check if this is a class-validator error
      if (
        exception instanceof BadRequestException &&
        this.isClassValidatorError(exceptionResponse)
      ) {
        const validationErrors = (exceptionResponse as any)
          .message as ValidationError[];
        // Only return the first validation message for each field
        const minimalErrors = this.formatValidationErrors(validationErrors);

        return response.status(status).json({ errors: minimalErrors });
      }

      // For other HttpExceptions, format them normally
      return response.status(status).json({
        errors: this.formatHttpException(exceptionResponse),
      });
    }

    // For any non-HttpException, return generic error
    console.error('Unhandled exception:', exception);
    return response.status(500).json({
      errors: [
        {
          message: 'Internal Server Error',
        },
      ],
    });
  }

  /**
   * Check whether the exception response comes from class-validator
   * by looking at its `message` property.
   */
  private isClassValidatorError(response: unknown): boolean {
    if (!response) return false;
    const resObj = response as any;
    // class-validator errors are usually an array of ValidationError objects
    return (
      Array.isArray(resObj.message) &&
      resObj.message.every(
        (item: ValidationError) => item && typeof item === 'object',
      )
    );
  }

  /**
   * Here we only take the *first* constraint message for each field.
   */
  private formatValidationErrors(errors: ValidationError[]) {
    const fieldErrors: Array<{ field: string; message: string }> = [];

    for (const error of errors) {
      // If there are multiple decorators (constraints) on the same field,
      // only get the *first* message (constraint).
      if (error.constraints) {
        const constraintMessages = Object.values(error.constraints);
        // Take only the first constraint message
        const firstMessage = constraintMessages[constraintMessages.length - 1];
        fieldErrors.push({
          field: error.property,
          message: firstMessage,
        });
      }

      // Handle nested errors (children) if using nested DTOs
      if (error.children && error.children.length > 0) {
        const nested = this.formatValidationErrors(error.children);
        // Push only the first message from each nested property as well
        fieldErrors.push(...nested);
      }
    }

    return fieldErrors;
  }

  /**
   * Convert other HttpExceptions (like ForbiddenException, etc.) to the unified format.
   */
  private formatHttpException(exceptionResponse: unknown) {
    if (typeof exceptionResponse === 'string') {
      return [{ message: exceptionResponse }];
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const messageProp = (exceptionResponse as any).message;

      if (Array.isArray(messageProp)) {
        return messageProp.map((msg: string) => ({ message: msg }));
      }

      if (typeof messageProp === 'string') {
        return [{ message: messageProp }];
      }

      // Otherwise, fallback to stringifying
      return [{ message: JSON.stringify(exceptionResponse) }];
    }

    return [{ message: 'Unknown error' }];
  }
}
