import { HttpError } from '../../src/models/HttpError';
import HttpCode from '../../src/constants/httpCode';

describe('HttpError', () => {
  describe('constructor', () => {
    it('should create an HttpError with message and error code', () => {
      const message = 'Test error message';
      const errorCode = HttpCode.BAD_REQUEST;
      
      const error = new HttpError(message, errorCode);
      
      expect(error.message).toBe(message);
      expect(error.code).toBe(errorCode);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
    });

    it('should create an HttpError with different error codes', () => {
      const testCases = [
        { message: 'Unauthorized', code: HttpCode.UNAUTHORIZED },
        { message: 'Not Found', code: HttpCode.NOT_FOUND },
        { message: 'Internal Server Error', code: HttpCode.INTERNAL_SERVER_ERROR },
        { message: 'Validation Error', code: HttpCode.UNPROCESSABLE_ENTITY }
      ];

      testCases.forEach(({ message, code }) => {
        const error = new HttpError(message, code);
        expect(error.message).toBe(message);
        expect(error.code).toBe(code);
      });
    });

    it('should handle empty message', () => {
      const error = new HttpError('', HttpCode.BAD_REQUEST);
      
      expect(error.message).toBe('');
      expect(error.code).toBe(HttpCode.BAD_REQUEST);
    });

    it('should handle zero error code', () => {
      const error = new HttpError('Test message', 0);
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(0);
    });
  });

  describe('error properties', () => {
    it('should have correct prototype chain', () => {
      const error = new HttpError('Test', HttpCode.BAD_REQUEST);
      
      expect(Object.getPrototypeOf(error)).toBe(HttpError.prototype);
      expect(Object.getPrototypeOf(HttpError.prototype)).toBe(Error.prototype);
    });

    it('should be throwable', () => {
      const error = new HttpError('Test error', HttpCode.BAD_REQUEST);
      
      expect(() => {
        throw error;
      }).toThrow(HttpError);
      
      expect(() => {
        throw error;
      }).toThrow('Test error');
    });
  });
}); 