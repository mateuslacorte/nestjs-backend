import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
    @ApiProperty({
        description: 'Email recipient',
        example: 'recipient@example.com'
    })
    @IsEmail({}, {message: 'Invalid email address'})
    @IsNotEmpty({message: 'Recipient email is required'})
    to!: string;

    @ApiProperty({
        description: 'Email subject',
        example: 'Test Email'
    })
    @IsString({message: 'Subject must be a string'})
    @IsNotEmpty({message: 'Subject is required'})
    subject!: string;

    @ApiProperty({
        description: 'Email HTML content',
        example: '<h1>Hello</h1><p>This is a test email</p>'
    })
    @IsString({message: 'HTML content must be a string'})
    @IsNotEmpty({message: 'HTML content is required'})
    html!: string;
}