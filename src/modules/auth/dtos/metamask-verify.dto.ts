import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MetamaskVerifyDto {
    @ApiProperty({
        example:
            'localhost wants you to sign in with your Ethereum account:\n0x...\n\nSign in to the NestJS Boilerplate\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: ...\nIssued At: ...',
        description: 'EIP-4361 SIWE message string signed by the wallet',
    })
    @IsString({ message: 'Message must be a string' })
    @IsNotEmpty({ message: 'Message is required' })
    message!: string;

    @ApiProperty({
        example: '0xabcdef...',
        description: 'Hex signature from personal_sign / MetaMask',
    })
    @IsString({ message: 'Signature must be a string' })
    @IsNotEmpty({ message: 'Signature is required' })
    signature!: string;
}
