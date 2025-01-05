import { IsNotEmpty, IsString } from 'class-validator';

import { AuthDto } from './auth.dto';

export class SignUpDto extends AuthDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
