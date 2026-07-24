import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendEmailDto } from './send-email.dto';

describe('SendEmailDto', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(SendEmailDto, plain);
    return validate(dto);
  }

  function constraintMessages(
    errors: Awaited<ReturnType<typeof validate>>,
    property: string,
  ): string[] {
    const error = errors.find((e) => e.property === property);
    return Object.values(error?.constraints ?? {});
  }

  it('accepts a valid payload', async () => {
    const errors = await validateDto({
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<h1>Hello</h1><p>This is a test email</p>',
    });
    expect(errors).toHaveLength(0);
  });

  describe('to', () => {
    it('requires to', async () => {
      const errors = await validateDto({
        subject: 'Hi',
        html: '<p>x</p>',
      });
      expect(errors.some((e) => e.property === 'to')).toBe(true);
      expect(constraintMessages(errors, 'to')).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/required|email|Invalid/i),
        ]),
      );
    });

    it('rejects empty to', async () => {
      const errors = await validateDto({
        to: '',
        subject: 'Hi',
        html: '<p>x</p>',
      });
      expect(errors.some((e) => e.property === 'to')).toBe(true);
      expect(constraintMessages(errors, 'to')).toEqual(
        expect.arrayContaining(['Recipient email is required']),
      );
    });

    it('rejects invalid email addresses', async () => {
      const errors = await validateDto({
        to: 'not-an-email',
        subject: 'Hi',
        html: '<p>x</p>',
      });
      expect(constraintMessages(errors, 'to')).toEqual(
        expect.arrayContaining(['Invalid email address']),
      );
    });

    it('rejects non-string to', async () => {
      const errors = await validateDto({
        to: 123,
        subject: 'Hi',
        html: '<p>x</p>',
      });
      expect(errors.some((e) => e.property === 'to')).toBe(true);
    });

    it('accepts common email formats', async () => {
      const errors = await validateDto({
        to: 'user.name+tag@example.co.uk',
        subject: 'Hi',
        html: '<p>x</p>',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('subject', () => {
    it('requires subject', async () => {
      const errors = await validateDto({
        to: 'a@b.com',
        html: '<p>x</p>',
      });
      expect(errors.some((e) => e.property === 'subject')).toBe(true);
    });

    it('rejects empty subject', async () => {
      const errors = await validateDto({
        to: 'a@b.com',
        subject: '',
        html: '<p>x</p>',
      });
      expect(constraintMessages(errors, 'subject')).toEqual(
        expect.arrayContaining(['Subject is required']),
      );
    });

    it('rejects non-string subject', async () => {
      const errors = await validateDto({
        to: 'a@b.com',
        subject: 42,
        html: '<p>x</p>',
      });
      expect(constraintMessages(errors, 'subject')).toEqual(
        expect.arrayContaining(['Subject must be a string']),
      );
    });
  });

  describe('html', () => {
    it('requires html', async () => {
      const errors = await validateDto({
        to: 'a@b.com',
        subject: 'Hi',
      });
      expect(errors.some((e) => e.property === 'html')).toBe(true);
    });

    it('rejects empty html', async () => {
      const errors = await validateDto({
        to: 'a@b.com',
        subject: 'Hi',
        html: '',
      });
      expect(constraintMessages(errors, 'html')).toEqual(
        expect.arrayContaining(['HTML content is required']),
      );
    });

    it('rejects non-string html', async () => {
      const errors = await validateDto({
        to: 'a@b.com',
        subject: 'Hi',
        html: { body: 'x' },
      });
      expect(constraintMessages(errors, 'html')).toEqual(
        expect.arrayContaining(['HTML content must be a string']),
      );
    });
  });

  it('reports multiple validation errors together', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property).sort();
    expect(properties).toEqual(['html', 'subject', 'to']);
  });
});
