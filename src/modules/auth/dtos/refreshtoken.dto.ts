import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshtokenDto {
    @IsString({ message: 'Refresh token must be a string' })
    @IsNotEmpty({ message: 'Refresh token is required' })
    'refreshToken': string;
}
