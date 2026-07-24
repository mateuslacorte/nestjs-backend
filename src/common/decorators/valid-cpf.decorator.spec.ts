import 'reflect-metadata';
import { IsOptional, validate } from 'class-validator';
import { getMetadataStorage } from 'class-validator';
import {
  ValidCpf,
  ValidCpfConstraint,
} from './valid-cpf.decorator';

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
    property: 'cpf',
    ...overrides,
  };
}

describe('ValidCpfConstraint', () => {
  let constraint: ValidCpfConstraint;

  beforeEach(() => {
    constraint = new ValidCpfConstraint();
  });

  describe('validate', () => {
    describe('happy paths', () => {
      it.each([
        ['529.982.247-25'],
        ['111.444.777-35'],
        ['390.533.447-05'],
        ['123.456.789-09'],
        ['52998224725'],
        ['11144477735'],
      ])('accepts valid CPF %s', (cpf) => {
        expect(constraint.validate(cpf, createArgs())).toBe(true);
      });

      it('strips formatting characters before validating', () => {
        expect(constraint.validate('529.982.247-25', createArgs())).toBe(true);
        expect(constraint.validate('52998224725', createArgs())).toBe(true);
      });

      it('strips spaces and other non-digit characters', () => {
        expect(constraint.validate('529 982 247 25', createArgs())).toBe(true);
        expect(constraint.validate('529/982/247-25', createArgs())).toBe(true);
      });
    });

    describe('length edge cases', () => {
      it('rejects empty string', () => {
        expect(constraint.validate('', createArgs())).toBe(false);
      });

      it('rejects CPF shorter than 11 digits', () => {
        expect(constraint.validate('5299822472', createArgs())).toBe(false);
        expect(constraint.validate('123', createArgs())).toBe(false);
      });

      it('rejects CPF longer than 11 digits', () => {
        expect(constraint.validate('529982247251', createArgs())).toBe(false);
        expect(constraint.validate('529.982.247-250', createArgs())).toBe(
          false,
        );
      });

      it('rejects string that becomes empty after stripping non-digits', () => {
        expect(constraint.validate('abc.def-ghi', createArgs())).toBe(false);
      });
    });

    describe('repeated digits', () => {
      it.each([
        ['00000000000'],
        ['11111111111'],
        ['22222222222'],
        ['33333333333'],
        ['44444444444'],
        ['55555555555'],
        ['66666666666'],
        ['77777777777'],
        ['88888888888'],
        ['99999999999'],
        ['000.000.000-00'],
        ['111.111.111-11'],
      ])('rejects all-same-digit CPF %s', (cpf) => {
        expect(constraint.validate(cpf, createArgs())).toBe(false);
      });
    });

    describe('invalid check digits', () => {
      it('rejects CPF with wrong first verification digit', () => {
        // Valid: 529.982.247-25 → change first check digit
        expect(constraint.validate('529.982.247-15', createArgs())).toBe(false);
      });

      it('rejects CPF with wrong second verification digit', () => {
        expect(constraint.validate('529.982.247-26', createArgs())).toBe(false);
      });

      it('rejects sequential but invalid CPF', () => {
        expect(constraint.validate('123.456.789-00', createArgs())).toBe(false);
      });

      it('rejects random 11-digit number with invalid checksum', () => {
        expect(constraint.validate('98765432101', createArgs())).toBe(false);
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
          constraint.validate(52998224725 as unknown as string, createArgs()),
        ).toThrow();
      });
    });

    it('ignores ValidationArguments contents for the result', () => {
      const withArgs = constraint.validate(
        '529.982.247-25',
        createArgs({ property: 'other', targetName: 'Other' }),
      );
      const withoutMeaningfulArgs = constraint.validate(
        '529.982.247-25',
        createArgs(),
      );
      expect(withArgs).toBe(true);
      expect(withoutMeaningfulArgs).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('returns the expected Brazilian CPF error message', () => {
      expect(constraint.defaultMessage(createArgs())).toBe(
        'Invalid CPF format. Please provide a valid Brazilian individual tax ID.',
      );
    });

    it('returns the same message regardless of ValidationArguments', () => {
      const messageA = constraint.defaultMessage(
        createArgs({ property: 'document', value: 'bad' }),
      );
      const messageB = constraint.defaultMessage(
        createArgs({ property: 'cpf', value: null }),
      );
      expect(messageA).toBe(messageB);
    });
  });
});

describe('ValidCpf decorator', () => {
  beforeEach(() => {
    mockedRegisterDecorator.mockClear();
  });

  it('returns a property decorator function', () => {
    const decorator = ValidCpf();
    expect(typeof decorator).toBe('function');
  });

  it('registers ValidCpfConstraint via registerDecorator', () => {
    class SampleDto {
      @ValidCpf()
      cpf!: string;
    }

    expect(mockedRegisterDecorator).toHaveBeenCalledTimes(1);
    expect(mockedRegisterDecorator).toHaveBeenCalledWith(
      expect.objectContaining({
        target: SampleDto,
        propertyName: 'cpf',
        constraints: [],
        validator: ValidCpfConstraint,
      }),
    );
  });

  it('forwards ValidationOptions to registerDecorator', () => {
    const options = {
      message: 'Custom CPF message',
      each: true,
      groups: ['create'],
    };

    class SampleDto {
      @ValidCpf(options)
      document!: string;
    }

    expect(mockedRegisterDecorator).toHaveBeenCalledWith(
      expect.objectContaining({
        target: SampleDto,
        propertyName: 'document',
        options,
        constraints: [],
        validator: ValidCpfConstraint,
      }),
    );
  });

  it('registers metadata that class-validator can resolve', () => {
    class MetadataDto {
      @ValidCpf({ message: 'bad cpf' })
      cpf!: string;
    }

    const storage = getMetadataStorage();
    const metas = storage.getTargetValidationMetadatas(
      MetadataDto,
      MetadataDto.name,
      false,
      false,
    );

    expect(metas.some((meta) => meta.propertyName === 'cpf')).toBe(true);
  });

  describe('integration with class-validator validate()', () => {
    class PersonDto {
      @ValidCpf()
      cpf!: string;
    }

    it('passes validation for a valid formatted CPF', async () => {
      const dto = new PersonDto();
      dto.cpf = '529.982.247-25';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('passes validation for a valid unformatted CPF', async () => {
      const dto = new PersonDto();
      dto.cpf = '11144477735';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for an invalid CPF', async () => {
      const dto = new PersonDto();
      dto.cpf = '111.111.111-11';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cpf');
      expect(errors[0].constraints).toEqual(
        expect.objectContaining({
          ValidCpfConstraint:
            'Invalid CPF format. Please provide a valid Brazilian individual tax ID.',
        }),
      );
    });

    it('uses custom message from ValidationOptions when provided', async () => {
      class CustomMessageDto {
        @ValidCpf({ message: 'CPF inválido' })
        cpf!: string;
      }

      const dto = new CustomMessageDto();
      dto.cpf = '12345678900';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual(
        expect.objectContaining({
          ValidCpfConstraint: 'CPF inválido',
        }),
      );
    });

    it('fails for wrong-length CPF through validate()', async () => {
      const dto = new PersonDto();
      dto.cpf = '123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('cpf');
    });

    describe('composition with IsOptional', () => {
      class OptionalCpfDto {
        @IsOptional()
        @ValidCpf()
        cpf?: string;
      }

      it('skips validation when value is undefined', async () => {
        const dto = new OptionalCpfDto();
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('skips validation when value is null', async () => {
        const dto = new OptionalCpfDto();
        dto.cpf = null as unknown as string;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('does not skip empty string (IsOptional only ignores null/undefined)', async () => {
        const dto = new OptionalCpfDto();
        dto.cpf = '';
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cpf');
      });

      it('still fails for an invalid provided CPF', async () => {
        const dto = new OptionalCpfDto();
        dto.cpf = '111.111.111-11';
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cpf');
      });
    });

    describe('each: true on string arrays', () => {
      class CpfListDto {
        @ValidCpf({ each: true })
        cpfs!: string[];
      }

      it('passes when every array entry is a valid CPF', async () => {
        const dto = new CpfListDto();
        dto.cpfs = ['529.982.247-25', '11144477735'];
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('fails when any array entry is an invalid CPF', async () => {
        const dto = new CpfListDto();
        dto.cpfs = ['529.982.247-25', '111.111.111-11'];
        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('cpfs');
      });
    });
  });
});
