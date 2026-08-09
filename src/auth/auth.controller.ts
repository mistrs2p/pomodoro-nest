import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { createUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() createUserDTO: createUserDTO,
  ): Promise<{ token: string }> {
    // register logic here
    const token = await this.authService.register(createUserDTO);
    return { token };
  }

  @Post('login')
  async login(
    @Body() LoginDTO: LoginDTO,
  ): Promise<{ token: string }> {
    // register logic here
    const token = await this.authService.login(LoginDTO);
    return { token };
  }
}
