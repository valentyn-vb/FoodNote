import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import type { RegisterRequestDto, UserResponseDto } from './dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() body: RegisterRequestDto): Promise<UserResponseDto> {
    return this.userService.create(body);
  }
}
