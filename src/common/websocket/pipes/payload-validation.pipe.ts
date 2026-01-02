import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class PayloadValidationPipe implements PipeTransform {
    async transform(value: any, metadata: ArgumentMetadata) {
        if (!value || !value.type) {
            throw new WsException('Invalid payload: type not specified');
        }

        // This is a basic validation
        // Specific validation should be implemented in the modules that use this pipe
        return value;
    }
}