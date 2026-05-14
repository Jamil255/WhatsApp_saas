import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

@Injectable()
export class PhoneNumberValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!E164_REGEX.test(value)) {
      throw new BadRequestException(
        `Invalid phone number: "${value}". Must be in E.164 format (e.g., +923001234567).`,
      );
    }
    return value;
  }
}
