import {IsEmail, IsNotEmpty, IsString, MinLength} from 'class-validator';

export class createUserDTO {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;
}