import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';
import { createResponse } from 'src/utils/response.util';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        exception instanceof BadRequestException &&
        this.isClassValidatorError(exceptionResponse)
      ) {
        const validationErrors = (exceptionResponse as any)
          .message as ValidationError[];
        const minimalErrors = this.formatValidationErrors(validationErrors);

        return response
          .status(status)
          .json(
            createResponse('error', 'Validation failed', null, minimalErrors),
          );
      }

      // Handle other HttpExceptions
      const formattedErrors = this.formatHttpException(exceptionResponse);
      return response
        .status(status)
        .json(
          createResponse(
            'error',
            exception.message || 'Request failed',
            null,
            formattedErrors,
          ),
        );
    }

    // For non-HttpExceptions
    console.error('Unhandled exception:', exception);
    return response
      .status(500)
      .json(
        createResponse('error', 'Internal Server Error', null, [
          { message: 'An unexpected error occurred' },
        ]),
      );
  }

  private isClassValidatorError(response: unknown): boolean {
    if (!response) return false;
    const resObj = response as any;
    return (
      Array.isArray(resObj.message) &&
      resObj.message.every(
        (item: ValidationError) => item && typeof item === 'object',
      )
    );
  }

  private formatValidationErrors(errors: ValidationError[]) {
    return errors
      .map((error) => {
        if (error.constraints) {
          const firstMessage = Object.values(error.constraints)[0];
          return { field: error.property, message: firstMessage };
        }
        if (error.children?.length) {
          return this.formatValidationErrors(error.children);
        }
        return { field: error.property, message: 'Invalid value' };
      })
      .flat();
  }

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
    }
    return [{ message: 'Unknown error' }];
  }
}
