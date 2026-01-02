import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string | undefined;
  private readonly instance: string | undefined;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('whatsapp.key');
    this.apiUrl = this.configService.get<string>('whatsapp.url');
    this.instance = this.configService.get<string>('whatsapp.instance');
  }

  /**
   * Send a WhatsApp message
   * @param to
   * @param message
   */
  async sendMessage(to: string, message: string): Promise<void> {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apiKey": this.apiKey || '',
      },
      body: JSON.stringify({
        number: "55"+to,
        text: message,
      }),
    };

    try {
      const response = await fetch(
          `${this.apiUrl}/message/sendText/${this.instance}`,
          requestOptions
      );

      const result = await response.text();
      console.log(result);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
}