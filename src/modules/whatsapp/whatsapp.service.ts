import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string | undefined;
  private readonly instance: string | undefined;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('whatsapp.key');
    this.apiUrl = this.configService.get<string>('whatsapp.url');
    this.instance = this.configService.get<string>('whatsapp.instance');
  }

  /**
   * Send a WhatsApp message via Evolution API.
   * The number is sent as provided (no DDI/country-code prefix is added).
   * @param to - Phone number digits as expected by Evolution API
   * @param message - Text message body
   */
  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.apiUrl || !this.instance) {
      throw new ServiceUnavailableException(
        'WhatsApp Evolution API is not configured',
      );
    }

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apiKey: this.apiKey || '',
      },
      body: JSON.stringify({
        number: to,
        text: message,
      }),
    };

    let response: Response;
    try {
      response = await fetch(
        `${this.apiUrl}/message/sendText/${this.instance}`,
        requestOptions,
      );
    } catch (error) {
      this.logger.error('Failed to reach Evolution API', error);
      throw new BadGatewayException(
        'Failed to reach WhatsApp Evolution API',
      );
    }

    const result = await response.text();

    if (!response.ok) {
      this.logger.error(
        `Evolution API returned ${response.status}: ${result}`,
      );
      throw new BadGatewayException(
        `WhatsApp Evolution API error (${response.status})`,
      );
    }

    this.logger.debug(`WhatsApp message sent to ${to}: ${result}`);
  }
}
