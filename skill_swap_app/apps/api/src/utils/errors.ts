export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 422)
  }
}

export class InsufficientCreditsError extends AppError {
  constructor() {
    super('Insufficient credits', 'INSUFFICIENT_CREDITS', 422)
  }
}

export class DuplicateError extends AppError {
  constructor(message = 'Already exists') {
    super(message, 'DUPLICATE_REQUEST', 409)
  }
}
