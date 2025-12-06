import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type Role = 'user' | 'admin';

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthUserWithPassword = AuthUser & { password: string };

@Injectable()
export class AuthService {
  private readonly users: AuthUserWithPassword[] = [
    {
      id: 'user1',
      name: 'Demo User',
      email: 'user@example.com',
      password: 'password',
      role: 'user',
    },
    {
      id: 'admin1',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin',
      role: 'admin',
    },
  ];

  constructor(private readonly jwtService: JwtService) {}

  validateUser(email: string, password: string): AuthUser | null {
    const match = this.users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!match) {
      return null;
    }
    const { password: _pw, ...user } = match;
    return user;
  }

  async login(email: string, password: string) {
    const user = this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user,
    };
  }
}
