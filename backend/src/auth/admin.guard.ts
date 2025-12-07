import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// AdminGuard builds on top of the existing JWT guard and checks email
@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const authed = await super.canActivate(context);
    if (!authed) {
      return false;
    }

    const req = context.switchToHttp().getRequest();
    const email = req?.user?.email;

    if (email !== 'admin@example.com') {
      throw new ForbiddenException('Admin access only');
    }

    return true;
  }
}
