import { Request, Response, NextFunction } from 'express';
import { createNewUser, verifyEmail } from '../../api/controllers/authController';
import User from '../../api/models/User';
import AuthVerificationToken from '../../api/models/AuthVerificationToken';
import HttpCode from '../../api/constants/httpCode';
import Mail from '../../api/lib/mail';

// Mock dependencies
jest.mock('../../api/models/User');
jest.mock('../../api/models/AuthVerificationToken');
jest.mock('../../api/lib/mail');
jest.mock('crypto');
jest.mock('dotenv/config');

const mockUser = User as jest.Mocked<typeof User>;
const mockAuthVerificationToken = AuthVerificationToken as jest.Mocked<typeof AuthVerificationToken>;
const mockMail = Mail as jest.Mocked<typeof Mail>;

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createNewUser', () => {
    it('should create a new user successfully', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      mockUser.findOne.mockResolvedValue(null);

      // Mock User.create to return a new user
      const createdUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test@example.com',
        verified: false,
        tokens: []
      };
      mockUser.create.mockResolvedValue(createdUser as any);

      // Mock AuthVerificationToken.create
      mockAuthVerificationToken.create.mockResolvedValue({} as any);

      // Mock Mail constructor and send method
      const mockMailInstance = {
        send: jest.fn()
      };
      (mockMail as any).mockImplementation(() => mockMailInstance);

      // Mock crypto.randomBytes
      const crypto = require('crypto');
      crypto.randomBytes = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('mock-token')
      });

      // Mock environment variables
      process.env.VERIFICATION_LINK = 'http://localhost:3000/verify';
      process.env.MAILTRAP_SENDER = 'noreply@example.com';

      await createNewUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify User.findOne was called with correct email
      expect(mockUser.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });

      // Verify User.create was called with correct data
      expect(mockUser.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!',
        verified: false,
        tokens: []
      });

      // Verify AuthVerificationToken.create was called
      expect(mockAuthVerificationToken.create).toHaveBeenCalledWith({
        user_id: createdUser.id,
        token: 'mock-token'
      });

      // Verify Mail was instantiated and send was called
      expect(mockMail).toHaveBeenCalledWith(
        ['test@example.com'],
        'noreply@example.com',
        expect.objectContaining({
          subject: 'Verification Mail',
          html: expect.stringContaining('http://localhost:3000/verify'),
          category: 'Integration Test'
        })
      );

      // Verify response was sent correctly
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Please check your inbox for verification link'
      });
    });

    it('should throw error when user already exists', async () => {
      // Mock User.findOne to return existing user
      const existingUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };
      mockUser.findOne.mockResolvedValue(existingUser as any);

      await createNewUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error was passed to next middleware
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized request, email is already in use!',
          code: HttpCode.UNAUTHORIZED
        })
      );

      // Verify User.create was not called
      expect(mockUser.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne to throw an error
      const dbError = new Error('Database connection failed');
      mockUser.findOne.mockRejectedValue(dbError);

      await createNewUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error was passed to next middleware
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle missing required fields', async () => {
      // Test with missing email
      mockRequest.body = {
        name: 'Test User',
        password: 'TestPass123!'
      };

      await createNewUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify User.findOne was called with undefined email
      expect(mockUser.findOne).toHaveBeenCalledWith({
        where: { email: undefined }
      });
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      mockRequest.body = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        token: 'valid-token'
      };
    });

    it('should verify email successfully with valid token', async () => {
      // Mock AuthVerificationToken.findOne to return a token
      const mockToken = {
        compareToken: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockResolvedValue(undefined)
      };
      mockAuthVerificationToken.findOne.mockResolvedValue(mockToken as any);

      // Mock User.update
      mockUser.update.mockResolvedValue([1] as any);

      await verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify AuthVerificationToken.findOne was called
      expect(mockAuthVerificationToken.findOne).toHaveBeenCalledWith({
        where: { user_id: '123e4567-e89b-12d3-a456-426614174000' }
      });

      // Verify compareToken was called
      expect(mockToken.compareToken).toHaveBeenCalledWith('valid-token');

      // Verify User.update was called
      expect(mockUser.update).toHaveBeenCalledWith(
        { verified: true },
        { where: { id: '123e4567-e89b-12d3-a456-426614174000' } }
      );

      // Verify token was destroyed
      expect(mockToken.destroy).toHaveBeenCalled();
    });

    it('should throw error when token is not a string', async () => {
      mockRequest.body = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        token: 123 // Invalid token type
      };

      await verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          code: HttpCode.BAD_REQUEST
        })
      );
    });

    it('should throw error when token not found', async () => {
      // Mock AuthVerificationToken.findOne to return null
      mockAuthVerificationToken.findOne.mockResolvedValue(null);

      await verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unauthorized Request',
          code: HttpCode.FORBIDDEN
        })
      );
    });

    it('should throw error when token comparison fails', async () => {
      // Mock AuthVerificationToken.findOne to return a token
      const mockToken = {
        compareToken: jest.fn().mockResolvedValue(false)
      };
      mockAuthVerificationToken.findOne.mockResolvedValue(mockToken as any);

      await verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          code: HttpCode.BAD_REQUEST
        })
      );
    });
  });
}); 