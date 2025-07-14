import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class StrongPasswordConstraint implements ValidatorConstraintInterface {
    validate(password: string, args: ValidationArguments): boolean {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        // Check for sequences of letters or numbers
        const hasNoSequences = !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|012|098|987|876|765|654|543|432|321)/i.test(
            password,
        );

        return hasUppercase && hasLowercase && hasNumber && hasSpecialChar && hasNoSequences;
    }

    defaultMessage(args: ValidationArguments): string {
        return 'Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and should not contain sequences like "abc" or "123".';
    }
}

export function StrongPassword(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: StrongPasswordConstraint,
        });
    };
}
