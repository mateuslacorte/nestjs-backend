import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({
        example: 'CurrentP@ssw0rd',
        description: 'Senha atual do usuário'
    })
    @IsString()
    @IsNotEmpty({ message: 'A senha atual é obrigatória' })
    currentPassword!: string;

    @ApiProperty({
        example: 'NewStr0ng!P@ssword',
        description: 'Nova senha (mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial)'
    })
    @IsString()
    @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial'
    })
    newPassword!: string;

    @ApiProperty({
        example: 'NewStr0ng!P@ssword',
        description: 'Confirmação da nova senha'
    })
    @IsString()
    @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
    confirmNewPassword!: string;
}

