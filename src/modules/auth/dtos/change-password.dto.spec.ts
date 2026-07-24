import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

const VALID_NEW_PASSWORD = 'NewStr0ng@Pass1';

describe('ChangePasswordDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(ChangePasswordDto, plain);
    return validate(dto);
  }

  function messages(
    errors: Awaited<ReturnType<typeof validate>>,
    property: string,
  ): string[] {
    return Object.values(
      errors.find((e) => e.property === property)?.constraints ?? {},
    );
  }

  const validBase = {
    currentPassword: 'CurrentP@ssw0rd',
    newPassword: VALID_NEW_PASSWORD,
    confirmNewPassword: VALID_NEW_PASSWORD,
  };

  it('accepts a valid change-password payload', async () => {
    expect(await validateDto(validBase)).toHaveLength(0);
  });

  it('requires currentPassword with PT-BR message', async () => {
    const { currentPassword: _currentPassword, ...withoutCurrent } = validBase;
    const errors = await validateDto(withoutCurrent);
    expect(messages(errors, 'currentPassword')).toEqual(
      expect.arrayContaining(['A senha atual é obrigatória']),
    );
  });

  it('rejects empty currentPassword', async () => {
    const errors = await validateDto({ ...validBase, currentPassword: '' });
    expect(messages(errors, 'currentPassword')).toEqual(
      expect.arrayContaining(['A senha atual é obrigatória']),
    );
  });

  it('rejects newPassword shorter than 8 characters', async () => {
    const errors = await validateDto({
      ...validBase,
      newPassword: 'Ab1@',
      confirmNewPassword: 'Ab1@',
    });
    expect(messages(errors, 'newPassword')).toEqual(
      expect.arrayContaining(['A nova senha deve ter no mínimo 8 caracteres']),
    );
  });

  it('rejects newPassword missing required charset with PT-BR message', async () => {
    const errors = await validateDto({
      ...validBase,
      newPassword: 'alllowercase1',
      confirmNewPassword: 'alllowercase1',
    });
    expect(messages(errors, 'newPassword')).toEqual(
      expect.arrayContaining([
        'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial',
      ]),
    );
  });

  it('rejects newPassword with disallowed special characters', async () => {
    const errors = await validateDto({
      ...validBase,
      newPassword: 'NewStr0ng#Pass1',
      confirmNewPassword: 'NewStr0ng#Pass1',
    });
    expect(messages(errors, 'newPassword')).toEqual(
      expect.arrayContaining([
        'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial',
      ]),
    );
  });

  it('accepts newPassword using allowed special characters only', async () => {
    const errors = await validateDto({
      ...validBase,
      newPassword: 'NewStr0ng@Pass1',
      confirmNewPassword: 'NewStr0ng@Pass1',
    });
    expect(errors).toHaveLength(0);
  });

  it('requires confirmNewPassword with PT-BR message', async () => {
    const { confirmNewPassword: _confirmNewPassword, ...withoutConfirm } =
      validBase;
    const errors = await validateDto(withoutConfirm);
    expect(messages(errors, 'confirmNewPassword')).toEqual(
      expect.arrayContaining(['A confirmação da senha é obrigatória']),
    );
  });

  it('rejects empty confirmNewPassword', async () => {
    const errors = await validateDto({
      ...validBase,
      confirmNewPassword: '',
    });
    expect(messages(errors, 'confirmNewPassword')).toEqual(
      expect.arrayContaining(['A confirmação da senha é obrigatória']),
    );
  });

  it('reports multiple validation errors together', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property).sort();
    expect(properties).toEqual([
      'confirmNewPassword',
      'currentPassword',
      'newPassword',
    ]);
  });
});
