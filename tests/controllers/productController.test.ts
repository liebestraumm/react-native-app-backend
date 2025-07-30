import { Request, Response, NextFunction } from 'express';
import { listNewProduct } from '../../src/controllers/productController';
import Product from '../../src/models/Product';
import Asset from '../../src/models/Asset';
import { HttpError } from '../../src/lib/HttpError';
import HttpCode from '../../src/constants/httpCode';
import cloudUploader from '../../src/cloud';

// Mock dependencies
jest.mock('../../src/models/Product');
jest.mock('../../src/models/Asset');
jest.mock('../../src/cloud');

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
      // Mock Product.create to return a new product
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
        description: 'A test product description',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
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
        id: '456e7890-e89b-12d3-a456-426614174000'
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
    });

    it('should handle product creation without images', async () => {
      // Mock no images
      mockRequest.files = {};

      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000'
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
    });

    it('should handle cloudinary upload errors', async () => {
      // Mock Product.create
      const createdProduct = {
        id: '456e7890-e89b-12d3-a456-426614174000'
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
  });
}); 