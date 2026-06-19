import { HttpClient } from '../http';
import { VerificationResource } from './verification';
import type { SendEmailParams, SendEmailResponse, VerifyEmailResponse } from '../types';

export class EmailsResource {
  private readonly verification: VerificationResource;

  constructor(private readonly http: HttpClient) {
    this.verification = new VerificationResource(http);
  }

  async send(params: SendEmailParams): Promise<SendEmailResponse> {
    return this.http.post<SendEmailResponse>('/v1/send', {
      body: params,
      authMode: 'secret'
    });
  }

  async verify(email: string): Promise<VerifyEmailResponse> {
    return this.verification.validate(email);
  }
}
