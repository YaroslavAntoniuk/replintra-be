export class ChatbotError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'ChatbotError';
  }
}

export class ValidationError extends ChatbotError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ChatbotError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}
