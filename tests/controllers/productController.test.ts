// Mock the entire models module and database
jest.mock('../../api/models', () => ({
  Product: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  Asset: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  User: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../api/db', () => ({
  sequelize: {
    authenticate: jest.fn(),
    sync: jest.fn(),
  },
}));

jest.mock('../../api/cloud', () => ({
  __esModule: true,
  default: {
    upload: jest.fn(),
    destroy: jest.fn(),
  },
  cloudApi: {
    delete_resources: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { listNewProduct } from '../../api/controllers/productController';
import { Product, Asset } from '../../api/models';
import { HttpError } from '../../api/lib/HttpError';
import HttpCode from '../../api/constants/httpCode';
import cloudUploader from '../../api/cloud';
import { IUserProfile } from '../../api/interfaces/IUserProfile';

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user: IUserProfile;
    }
  }
}

const mockProduct = Product as jest.Mocked<typeof Product>;
const mockAsset = Asset as jest.Mocked<typeof Asset>;
const mockCloudUploader = cloudUploader as jest.Mocked<typeof cloudUploader>;

// Helper function to create mock File objects
const createMockFile = (filepath: string, mimetype: string) => ({
  filepath,
  mimetype,
  size: 1024,
  originalFilename: filepath.split('/').pop() || 'test.jpg',
  newFilename: filepath.split('/').pop() || 'test.jpg',
  hashAlgorithm: false as const,
  toJSON: () => ({
    filepath,
    length: 1024,
    mimetype,
    mtime: new Date(),
    size: 1024,
    originalFilename: filepath.split('/').pop() || 'test.jpg',
    newFilename: filepath.split('/').pop() || 'test.jpg',
    hashAlgorithm: false as const
  })
});

describe('ProductController', () => {
  let mockRequest: Partial<Request> & { files?: { [key: string]: any } };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {
        name: 'Test Product',
        price: '99.99',
        category: 'Electronics',
        description: 'A test product description',
        purchasingDate: '2023-01-15'
      },
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test@example.com',
        verified: true,
        avatar: ''
      },
      files: {
        images: [createMockFile('/tmp/test-image.jpg', 'image/jpeg')]
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

  describe('listNewProduct', () => {
    it('should create a new product successfully with single image', async () => {
      // Mock Product.create to return a new product with update method
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
        description: 'A test product description',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        update: jest.fn().mockResolvedValue(true)
      };
      mockProduct.create.mockResolvedValue(createdProduct as any);

      // Mock cloudinary upload
      mockCloudUploader.upload.mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        public_id: 'test-public-id'
      } as any);

      // Mock Asset.create
      mockAsset.create.mockResolvedValue({} as any);

      await listNewProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify Product.create was called with correct data
      expect(mockProduct.create).toHaveBeenCalledWith({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: '99.99',
        category: 'Electronics',
        description: 'A test product description',
        purchasingDate: '2023-01-15'
      });

      // Verify cloudinary upload was called
      expect(mockCloudUploader.upload).toHaveBeenCalledWith(
        '/tmp/test-image.jpg',
        {
          width: 1280,
          height: 720,
          crop: 'fill'
        }
      );

      // Verify Asset.create was called
      expect(mockAsset.create).toHaveBeenCalledWith({
        url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        product_id: '456e7890-e89b-12d3-a456-426614174000'
      });

      // Verify product update was called with thumbnail
      expect(createdProduct.update).toHaveBeenCalledWith({
        thumbnail: 'https://res.cloudinary.com/test/image/upload/test.jpg'
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'New product added!' });
    });

    it('should create a new product successfully with multiple images', async () => {
      // Mock multiple images
      mockRequest.files = {
        images: [
          createMockFile('/tmp/test-image1.jpg', 'image/jpeg'),
          createMockFile('/tmp/test-image2.jpg', 'image/png')
        ]
      };

      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        update: jest.fn().mockResolvedValue(true)
      };
      mockProduct.create.mockResolvedValue(createdProduct as any);

      // Mock cloudinary upload for multiple images
      mockCloudUploader.upload
        .mockResolvedValueOnce({
          secure_url: 'https://res.cloudinary.com/test/image/upload/test1.jpg',
          public_id: 'test-public-id-1'
        } as any)
        .mockResolvedValueOnce({
          secure_url: 'https://res.cloudinary.com/test/image/upload/test2.jpg',
          public_id: 'test-public-id-2'
        } as any);

      // Mock Asset.create
      mockAsset.create.mockResolvedValue({} as any);

      await listNewProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify cloudinary upload was called twice
      expect(mockCloudUploader.upload).toHaveBeenCalledTimes(2);

      // Verify Asset.create was called twice
      expect(mockAsset.create).toHaveBeenCalledTimes(2);

      // Verify product update was called with first image as thumbnail
      expect(createdProduct.update).toHaveBeenCalledWith({
        thumbnail: 'https://res.cloudinary.com/test/image/upload/test1.jpg'
      });
    });

    it('should create a new product successfully without images', async () => {
      // Mock no images
      mockRequest.files = {};

      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        update: jest.fn().mockResolvedValue(true)
      };
      mockProduct.create.mockResolvedValue(createdProduct as any);

      await listNewProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify Product.create was called
      expect(mockProduct.create).toHaveBeenCalled();

      // Verify cloudinary upload was not called
      expect(mockCloudUploader.upload).not.toHaveBeenCalled();

      // Verify Asset.create was not called
      expect(mockAsset.create).not.toHaveBeenCalled();

      // Verify product update was called with undefined thumbnail
      expect(createdProduct.update).toHaveBeenCalledWith({
        thumbnail: undefined
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'New product added!' });
    });

    it('should handle cloudinary upload errors', async () => {
      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        update: jest.fn().mockResolvedValue(true)
      };
      mockProduct.create.mockResolvedValue(createdProduct as any);

      // Mock cloudinary upload to throw an error
      const uploadError = new Error('Upload failed');
      mockCloudUploader.upload.mockRejectedValue(uploadError);

      await listNewProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify error was passed to next middleware
      expect(mockNext).toHaveBeenCalledWith(uploadError);
    });

    it('should throw error when more than 5 images are uploaded', async () => {
      // Mock more than 5 images
      mockRequest.files = {
        images: Array(6).fill(null).map((_, i) => 
          createMockFile(`/tmp/test-image${i}.jpg`, 'image/jpeg')
        )
      };

      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        update: jest.fn().mockResolvedValue(true)
      };
      mockProduct.create.mockResolvedValue(createdProduct as any);

      // Expect the function to throw an error directly
      await expect(listNewProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )).rejects.toThrow('Image files can not be more than 5!');
    });

    it('should throw error for invalid file type', async () => {
      // Mock invalid file type
      mockRequest.files = {
        images: [createMockFile('/tmp/test-file.txt', 'text/plain')]
      };

      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        update: jest.fn().mockResolvedValue(true)
      };
      mockProduct.create.mockResolvedValue(createdProduct as any);

      // Expect the function to throw an error directly
      await expect(listNewProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )).rejects.toThrow('Invalid file type, files must be image type!');
    });
  });
}); 