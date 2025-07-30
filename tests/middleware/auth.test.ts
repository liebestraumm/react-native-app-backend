import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { isAuth } from '../../api/middleware/auth';
import User from '../../api/models/User';
import HttpCode from '../../api/constants/httpCode';
import envs from '../../api/env';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../api/models/User');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUser = User as jest.Mocked<typeof User>;

describe('isAuth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('should authenticate user with valid token', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      // Mock request headers
      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };

      // Mock jwt.verify to return decoded token
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      // Mock User.findByPk to return user
      const mockUserData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        verified: true,
        avatar: null
      };
      mockUser.findByPk.mockResolvedValue(mockUserData as any);

      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify jwt.verify was called with correct token
      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockToken,
        envs.JWT_SECRET ?? ''
      );

      // Verify User.findByPk was called with correct id
      expect(mockUser.findByPk).toHaveBeenCalledWith(mockDecodedToken.id, {
        include: [{ model: expect.anything(), as: 'avatar' }]
      });

      // Verify user was added to request
      expect(mockRequest.user).toEqual({
        id: mockUserData.id,
        name: mockUserData.name,
        email: mockUserData.email,
        verified: mockUserData.verified,
        avatar: ''
      });

      // Verify next was called
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error was passed to next middleware
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized request',
          code: HttpCode.FORBIDDEN
        })
      );

      // Verify jwt.verify was not called
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    it('should reject request with empty authorization header', async () => {
      mockRequest.headers = {
        authorization: ''
      };

      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized request',
          code: HttpCode.FORBIDDEN
        })
      );
    });

    it('should reject request with invalid JWT token', async () => {
      const mockToken = 'invalid-jwt-token';

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };

      // Mock jwt.verify to throw a JsonWebTokenError
      mockJwt.verify.mockImplementation(() => {
        throw new JsonWebTokenError('Invalid token');
      });

      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // The middleware catches JsonWebTokenError and converts it to HttpError
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized access',
          code: HttpCode.UNAUTHORIZED
        })
      );
    });

    it('should reject request when user not found in database', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };

      // Mock jwt.verify to return decoded token
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      // Mock User.findByPk to return null (user not found)
      mockUser.findByPk.mockResolvedValue(null);

      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized request',
          code: HttpCode.FORBIDDEN
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockToken = 'valid-jwt-token';
      const mockDecodedToken = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };

      // Mock jwt.verify to return decoded token
      mockJwt.verify.mockReturnValue(mockDecodedToken as any);

      // Mock User.findByPk to throw an error
      const dbError = new Error('Database connection failed');
      mockUser.findByPk.mockRejectedValue(dbError);

      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error was passed to next middleware
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle JWT_SECRET environment variable missing', async () => {
      const mockToken = 'valid-jwt-token';

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`
      };

      // Mock jwt.verify to throw a JsonWebTokenError due to missing secret
      mockJwt.verify.mockImplementation(() => {
        throw new JsonWebTokenError('jwt must be provided');
      });

      await isAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized access',
          code: HttpCode.UNAUTHORIZED
        })
      );
    });
  });
}); 