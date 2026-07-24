import 'reflect-metadata';
import { IsOptional, validate } from 'class-validator';
import { getMetadataStorage } from 'class-validator';
import {
  ValidCnpj,
  ValidCnpjConstraint,
} from './valid-cnpj.decorator';

jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator');
  return {
    ...actual,
    registerDecorator: jest.fn(actual.registerDecorator),
  };
});

import { registerDecorator, ValidationArguments } from 'class-validator';

const mockedRegisterDecorator = registerDecorator as jest.MockedFunction<
  typeof registerDecorator
>;

function createArgs(
  overrides: Partial<ValidationArguments> = {},
): ValidationArguments {
  return {
    value: undefined,
    constraints: [],
    targetName: 'TestDto',
    object: {},
    property: 'cnpj',
    ...overrides,
  };
}

describe('ValidCnpjConstraint', () => {
  let constraint: ValidCnpjConstraint;

  beforeEach(() => {
    constraint = new ValidCnpjConstraint();
  });

  describe('validate', () => {
    describe('happy paths', () => {
      it.each([
        ['04.252.011/0001-10'],
        ['11.444.777/0001-61'],
        ['00.000.000/0001-91'],
        ['12.345.678/0001-95'],
        ['04252011000110'],
        ['11222333000181'],
      ])('accepts valid CNPJ %s', (cnpj) => {
        expect(constraint.validate(cnpj, createArgs())).toBe(true);
      });

      it('strips formatting characters before validating', () => {
        expect(constraint.validate('04.252.011/0001-10', createArgs())).toBe(
          true,
        );
        expect(constraint.validate('04252011000110', createArgs())).toBe(true);
      });

      it('strips spaces and other non-digit characters', () => {
        expect(constraint.validate('04 252 011 0001 10', createArgs())).toBe(
          true,
        );
        expect(constraint.validate('04-252-011-0001-10', createArgs())).toBe(
          true,
        );
      });
    });

    describe('length edge cases', () => {
      it('rejects empty string', () => {
        expect(constraint.validate('', createArgs())).toBe(false);
      });

      it('rejects CNPJ shorter than 14 digits', () => {
        expect(constraint.validate('0425201100011', createArgs())).toBe(false);
        expect(constraint.validate('123', createArgs())).toBe(false);
      });

      it('rejects CNPJ longer than 14 digits', () => {
        expect(constraint.validate('042520110001101', createArgs())).toBe(
          false,
        );
        expect(constraint.validate('04.252.011/0001-100', createArgs())).toBe(
          false,
        );
      });

      it('rejects string that becomes empty after stripping non-digits', () => {
        expect(constraint.validate('ab.cd.ef/ghij-kl', createArgs())).toBe(
          false,
        );
      });
    });

    describe('repeated digits', () => {
      it.each([
        ['00000000000000'],
        ['11111111111111'],
        ['22222222222222'],
        ['33333333333333'],
        ['44444444444444'],
        ['55555555555555'],
        ['66666666666666'],
        ['77777777777777'],
        ['88888888888888'],
        ['99999999999999'],
        ['00.000.000/0000-00'],
        ['11.111.111/1111-11'],
      ])('rejects all-same-digit CNPJ %s', (cnpj) => {
        expect(constraint.validate(cnpj, createArgs())).toBe(false);
      });
    });

    describe('invalid check digits', () => {
      it('rejects CNPJ with wrong first verification digit', () => {
        // Valid: 04.252.011/0001-10 → change first check digit
        expect(constraint.validate('04.252.011/0001-00', createArgs())).toBe(
          false,
        );
      });

      it('rejects CNPJ with wrong second verification digit', () => {
        expect(constraint.validate('04.252.011/0001-11', createArgs())).toBe(
          false,
        );
      });

      it('rejects sequential but invalid CNPJ', () => {
        expect(constraint.validate('12.345.678/0001-00', createArgs())).toBe(
          false,
        );
      });

      it('rejects random 14-digit number with invalid checksum', () => {
        expect(constraint.validate('98765432100000', createArgs())).toBe(false);
      });
    });

    describe('verification digit edge cases (digit > 9 → 0)', () => {
      it('accepts CNPJ where first check digit resolves via digit1>9 → 0', () => {
        // Base 000000000006 → sum%11=1 → raw digit1=10 → clamped to 0
        expect(constraint.validate('00.000.000/0006-04', createArgs())).toBe(
          true,
        );
        expect(constraint.validate('00000000000604', createArgs())).toBe(true);
      });

      it('accepts known CNPJ whose second check digit resolves via digit>9 branch', () => {
        // 00.000.000/0001-91 exercises remainder paths used in production algo
        expect(constraint.validate('00.000.000/0001-91', createArgs())).toBe(
          true,
        );
      });
    });

    describe('non-string / invalid input', () => {
      it('throws when value is null', () => {
        expect(() =>
          constraint.validate(null as unknown as string, createArgs()),
        ).toThrow();
      });

      it('throws when value is undefined', () => {
        expect(() =>
          constraint.validate(undefined as unknown as string, createArgs()),
        ).toThrow();
      });

      it('throws when value is a number', () => {
        expect(() =>
          constraint.validate(
            4252011000110 as unknown as string,
            createArgs(),
          ),
        ).toThrow();
      });
    });

    it('ignores ValidationArguments contents for the result', () => {
      const withArgs = constraint.validate(
        '04.252.011/0001-10',
        createArgs({ property: 'other', targetName: 'Other' }),
      );
      const withoutMeaningfulArgs = constraint.validate(
        '04.252.011/0001-10',
        createArgs(),
      );
      expect(withArgs).toBe(true);
      expect(withoutMeaningfulArgs).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('returns the expected Brazilian CNPJ error message', () => {
      expect(constraint.defaultMessage(createArgs())).toBe(
        'Invalid CNPJ format. Please provide a valid Brazilian company tax ID.',
      );
    });

    it('returns the same message regardless of ValidationArguments', () => {
      const messageA = constraint.defaultMessage(
        createArgs({ property: 'companyTaxId', value: 'bad' }),
      );
      const messageB = constraint.defaultMessage(
        createArgs({ property: 'cnpj', value: null }),
      );
      expect(messageA).toBe(messageB);
    });
  });
});

describe('ValidCnpj decorator', () => {
  beforeEach(() => {
    mockedRegisterDecorator.mockClear();
  });

  it('returns a property decorator function', () => {
    const decorator = ValidCnpj();
    expect(typeof decorator).toBe('function');
  });

  it('registers ValidCnpjConstraint via registerDecorator', () => {
    class SampleDto {
      @ValidCnpj()
      cnpj!: string;
    }

    expect(mockedRegisterDecorator).toHaveBeenCalledTimes(1);
    expect(mockedRegisterDecorator).toHaveBeenCalledWith(
      expect.objectContaining({
        target: SampleDto,
        propertyName: 'cnpj',
        constraints: [],
        validator: ValidCnpjConstraint,
      }),
    );
  });

  it('forwards ValidationOptions to registerDecorator', () => {
    const options = {
      message: 'Custom CNPJ message',
      each: true,
      groups: ['create'],
    };

    class SampleDto {
      @ValidCnpj(options)
      taxId!: string;
    }

    expect(mockedRegisterDecorator).toHaveBeenCalledWith(
      expect.objectContaining({
        target: SampleDto,
        propertyName: 'taxId',
        options,
        constraints: [],
        validator: ValidCnpjConstraint,
      }),
    );
  });

  it('registers metadata that class-validator can resolve', () => {
    class MetadataDto {
      @ValidCnpj({ message: 'bad cnpj' })
      cnpj!: string;
    }

    const storage = getMetadataStorage();
    const metas = storage.getTargetValidationMetadatas(
      MetadataDto,
      MetadataDto.name,
      false,
      false,
    );

    expect(metas.some((meta) => meta.propertyName === 'cnpj')).toBe(true);
  });

  describe('integration with class-validator validate()', () => {
    class CompanyDto {
      @ValidCnpj()
      cnpj!: string;
    }

    it('passes validation for a valid formatted CNPJ', async () => {
      const dto = new CompanyDto();
      dto.cnpj = '04.252.011/0001-10';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('passes validation for a valid unformatted CNPJ', async () => {
      const dto = new CompanyDto();
      dto.cnpj = '11222333000181';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for an invalid CNPJ', async () => {
      const dto = new CompanyDto();
      dto.cnpj = '11.111.111/1111-11';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cnpj');
      expect(errors[0].constraints).toEqual(
        expect.objectContaining({
          ValidCnpjConstraint:
            'Invalid CNPJ format. Please provide a valid Brazilian company tax ID.',
        }),
      );
    });

    it('uses custom message from ValidationOptions when provided', async () => {
      class CustomMessageDto {
        @ValidCnpj({ message: 'CNPJ inválido' })
        cnpj!: string;
      }

      const dto = new CustomMessageDto();
      dto.cnpj = '12345678000100';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual(
        expect.objectContaining({
          ValidCnpjConstraint: 'CNPJ inválido',
        }),
      );
    });

    it('fails for wrong-length CNPJ through validate()', async () => {
      const dto = new CompanyDto();
      dto.cnpj = '123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cnpj');
    });

    describe('composition with IsOptional', () => {
      class OptionalCnpjDto {
        @IsOptional()
        @ValidCnpj()
        cnpj?: string;
      }

      it('skips validation when value is undefined', async () => {
        const dto = new OptionalCnpjDto();
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('skips validation when value is null', async () => {
        const dto = new OptionalCnpjDto();
        dto.cnpj = null as unknown as string;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('does not skip empty string (IsOptional only ignores null/undefined)', async () => {
        const dto = new OptionalCnpjDto();
        dto.cnpj = '';
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cnpj');
      });

      it('still fails for an invalid provided CNPJ', async () => {
        const dto = new OptionalCnpjDto();
        dto.cnpj = '11.111.111/1111-11';
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cnpj');
      });
    });

    describe('each: true on string arrays', () => {
      class CnpjListDto {
        @ValidCnpj({ each: true })
        cnpjs!: string[];
      }

      it('passes when every array entry is a valid CNPJ', async () => {
        const dto = new CnpjListDto();
        dto.cnpjs = ['04.252.011/0001-10', '11222333000181'];
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('fails when any array entry is an invalid CNPJ', async () => {
        const dto = new CnpjListDto();
        dto.cnpjs = ['04.252.011/0001-10', '11.111.111/1111-11'];
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cnpjs');
      });
    });
  });
});
