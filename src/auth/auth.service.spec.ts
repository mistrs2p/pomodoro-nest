import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findUserByEmail: jest.Mock; createUser: jest.Mock; updateUserPassword: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUserPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'signed-token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create new social users without a password', async () => {
    usersService.findUserByEmail.mockResolvedValue(null);
    usersService.createUser.mockImplementation(async (data) => ({
      id: 1,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    }));

    const result = await service.socialLogin({
      email: 'google-user@example.com',
      name: 'Google User',
      provider: 'google',
    });

    expect(result).toBe('signed-token');
    const createdUser = usersService.createUser.mock.calls[0][0];
    expect(createdUser.password).toBeNull();
  });

  it('should reject a social-only account when trying credentials login', async () => {
    usersService.findUserByEmail.mockResolvedValue({
      id: 7,
      email: 'google-user@example.com',
      password: '',
      isTwoFAEnabled: false,
    });

    await expect(
      service.login({ email: 'google-user@example.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
