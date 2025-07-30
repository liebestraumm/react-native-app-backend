import { newUserSchema, verifyTokenSchema, resetPassSchema } from '../../api/lib/validators';

describe('Validators', () => {
  describe('newUserSchema - Email Validation', () => {
    it('should validate correct email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@test.com',
        'test.email@subdomain.example.com'
      ];

      for (const email of validEmails) {
        const userData = {
          name: 'Test User',
          email,
          password: 'TestPass123!'
        };

        const result = await newUserSchema.validate(userData);
        expect(result.email).toBe(email);
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@.com',
        'test@example.'
      ];

      for (const email of invalidEmails) {
        const userData = {
          name: 'Test User',
          email,
          password: 'TestPass123!'
        };

        await expect(newUserSchema.validate(userData)).rejects.toThrow();
      }
    });

    it('should reject empty email', async () => {
      const userData = {
        name: 'Test User',
        email: '',
        password: 'TestPass123!'
      };

      await expect(newUserSchema.validate(userData)).rejects.toThrow('Email is missing');
    });

    it('should reject missing email field', async () => {
      const userData = {
        name: 'Test User',
        password: 'TestPass123!'
      };

      await expect(newUserSchema.validate(userData)).rejects.toThrow('Email is missing');
    });
  });

  describe('newUserSchema - Password Validation', () => {
    it('should validate correct password formats', async () => {
      const validPasswords = [
        'TestPass123!',
        'MySecure1@',
        'ComplexP@ss1',
        'StrongP@ssw0rd'
      ];

      for (const password of validPasswords) {
        const userData = {
          name: 'Test User',
          email: 'test@example.com',
          password
        };

        const result = await newUserSchema.validate(userData);
        expect(result.password).toBe(password);
      }
    });

    it('should reject passwords without required characters', async () => {
      const invalidPasswords = [
        'password', // no uppercase, no number, no special char
        'PASSWORD', // no lowercase, no number, no special char
        'Password', // no number, no special char
        'Password1', // no special char
        'Pass@word', // no number
        '12345678', // no letters, no special char
        'Pass@1', // too short
      ];

      for (const password of invalidPasswords) {
        const userData = {
          name: 'Test User',
          email: 'test@example.com',
          password
        };

        await expect(newUserSchema.validate(userData)).rejects.toThrow();
      }
    });

    it('should reject empty password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: ''
      };

      await expect(newUserSchema.validate(userData)).rejects.toThrow('Password is missing');
    });

    it('should reject password shorter than 8 characters', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1!'
      };

      await expect(newUserSchema.validate(userData)).rejects.toThrow('Password should be at least 8 chars long!');
    });
  });

  describe('UUID Validation', () => {
    it('should validate correct UUID formats', async () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b812-9dad-11d1-80b4-00c04fd430c8'
      ];

      for (const uuid of validUUIDs) {
        const tokenData = {
          id: uuid,
          token: 'test-token'
        };

        const result = await verifyTokenSchema.validate(tokenData);
        expect(result.id).toBe(uuid);
      }
    });

    it('should reject invalid UUID formats', async () => {
      const invalidUUIDs = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        '123e4567-e89b-12d3-a456', // incomplete
        '',
        undefined
      ];

      for (const uuid of invalidUUIDs) {
        const tokenData = {
          id: uuid,
          token: 'test-token'
        };

        await expect(verifyTokenSchema.validate(tokenData)).rejects.toThrow('Invalid user id');
      }
    });
  });
}); 