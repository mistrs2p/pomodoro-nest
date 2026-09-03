import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';

describe('AuthService', () => {
  const findUserByEmailMock = jest.fn((): Promise<User | null> =>
    Promise.resolve(null),
  );
  const findUserByIdMock = jest.fn((): Promise<User | null> =>
    Promise.resolve(null),
  );
  const createUserMock = jest.fn((data: Partial<User>): Promise<User> =>
    Promise.resolve({
      id: 1,
      email: data.email ?? 'user@example.com',
      password: data.password ?? null,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
    }),
  );
  const updateUserPasswordMock = jest.fn(() =>
    Promise.resolve({ affected: 1 }),
  );
  const signMock = jest.fn(() => 'signed-token');
  const usersService = {
    findUserByEmail: findUserByEmailMock,
    findUserById: findUserByIdMock,
    createUser: createUserMock,
    updateUserPassword: updateUserPasswordMock,
  } as unknown as UsersService;
  const jwtService = { sign: signMock } as unknown as JwtService;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUserByEmailMock.mockResolvedValue(null);
    service = new AuthService(usersService, jwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create new social users without a password', async () => {
    const result = await service.socialLogin({
      email: 'google-user@example.com',
      name: 'Google User',
      provider: 'google',
    });

    expect(result).toBe('signed-token');
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'google-user@example.com',
        password: null,
      }),
    );
  });

  it('should reject a social-only account when trying credentials login', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 7,
      email: 'google-user@example.com',
      password: null,
      firstName: 'Google',
      lastName: 'User',
      isTwoFAEnabled: false,
    });

    await expect(
      service.login({
        email: 'google-user@example.com',
        password: 'secret123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
