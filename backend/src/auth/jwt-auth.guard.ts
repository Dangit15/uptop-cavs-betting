import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Temporary debug log to confirm guard runs
    const req = context.switchToHttp().getRequest();
    console.log('DEBUG JwtAuthGuard.canActivate path =', req?.url);
    return super.canActivate(context);
  }
}
