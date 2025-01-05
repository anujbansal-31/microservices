import { Status } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsEnum(Status)
  status: Status;
}
