import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TurnstileResponse = { success: boolean; ['error-codes']?: string[] };

@Injectable()
export class CaptchaService {
  constructor(private readonly config: ConfigService) {}

  async verify(token?: string): Promise<void> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) return;
    if (!token)
      throw new BadRequestException('Veuillez valider la vérification anti-robot.');
    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: new URLSearchParams({ secret, response: token }),
          signal: AbortSignal.timeout(5000),
        },
      );
      const result = (await response.json()) as TurnstileResponse;
      if (!result.success)
        throw new BadRequestException('La vérification anti-robot a échoué.');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'La vérification anti-robot est momentanément indisponible.',
      );
    }
  }
}
