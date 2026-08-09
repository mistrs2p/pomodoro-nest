import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<CreateUserDto> {
    // register logic here
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(): Promise<{ msg: string }> {
    // login logic here
    return {
      msg: 'User logged in successfully',
    };
  }
}
