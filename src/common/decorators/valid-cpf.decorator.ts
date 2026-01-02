import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class ValidCpfConstraint implements ValidatorConstraintInterface {
    validate(cpf: string, args: ValidationArguments): boolean {
        // Remove any non-digit characters
        cpf = cpf.replace(/[^\d]/g, '');

        // Check if it has 11 digits
        if (cpf.length !== 11) {
            return false;
        }

        // Check if all digits are the same
        if (/^(\d)\1+$/.test(cpf)) {
            return false;
        }

        // Calculate first verification digit
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = sum % 11;
        let digit1 = remainder < 2 ? 0 : 11 - remainder;

        // Calculate second verification digit
        sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        sum += digit1 * 2;
        remainder = sum % 11;
        let digit2 = remainder < 2 ? 0 : 11 - remainder;

        // Check if calculated verification digits match the provided ones
        return (
            parseInt(cpf.charAt(9)) === digit1 &&
            parseInt(cpf.charAt(10)) === digit2
        );
    }

    defaultMessage(args: ValidationArguments): string {
        return 'Invalid CPF format. Please provide a valid Brazilian individual tax ID.';
    }
}

export function ValidCpf(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: ValidCpfConstraint,
        });
    };
}