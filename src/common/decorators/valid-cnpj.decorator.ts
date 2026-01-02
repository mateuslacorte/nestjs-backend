import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class ValidCnpjConstraint implements ValidatorConstraintInterface {
    validate(cnpj: string, args: ValidationArguments): boolean {
        // Remove any non-digit characters
        cnpj = cnpj.replace(/[^\d]/g, '');

        // Check if it has 14 digits
        if (cnpj.length !== 14) {
            return false;
        }

        // Check if all digits are the same
        if (/^(\d)\1+$/.test(cnpj)) {
            return false;
        }

        // Calculate first verification digit
        let sum = 0;
        let weight = 5;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cnpj.charAt(i)) * weight;
            weight = weight === 2 ? 9 : weight - 1;
        }
        let digit1 = 11 - (sum % 11);
        if (digit1 > 9) {
            digit1 = 0;
        }

        // Calculate second verification digit
        sum = 0;
        weight = 6;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cnpj.charAt(i)) * weight;
            weight = weight === 2 ? 9 : weight - 1;
        }
        sum += digit1 * 2;
        let digit2 = 11 - (sum % 11);
        if (digit2 > 9) {
            digit2 = 0;
        }

        // Check if calculated verification digits match the provided ones
        return (
            parseInt(cnpj.charAt(12)) === digit1 &&
            parseInt(cnpj.charAt(13)) === digit2
        );
    }

    defaultMessage(args: ValidationArguments): string {
        return 'Invalid CNPJ format. Please provide a valid Brazilian company tax ID.';
    }
}

export function ValidCnpj(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: ValidCnpjConstraint,
        });
    };
}