import { HttpClient } from '../http';
import type {
  BulkEmailValidationJobResponse,
  CreateBulkEmailValidationParams,
  DeleteBulkEmailValidationResponse,
  DownloadBulkEmailValidationParams,
  ListBulkEmailValidationsParams,
  ListBulkEmailValidationsResponse,
  ListVerificationCreditLedgerParams,
  ListVerificationCreditLedgerResponse,
  VerificationCreditsResponse,
  VerifyEmailResponse
} from '../types';

export class VerificationResource {
  constructor(private readonly http: HttpClient) {}

  async validate(email: string): Promise<VerifyEmailResponse> {
    return this.http.post<VerifyEmailResponse>('/v1/verify', {
      body: { email },
      authMode: 'secret'
    });
  }

  async createBulk(params: CreateBulkEmailValidationParams): Promise<BulkEmailValidationJobResponse> {
    const formData = new FormData();
    if (params.filename !== undefined) {
      formData.append('file', params.file, params.filename);
    } else {
      formData.append('file', params.file);
    }

    return this.http.post<BulkEmailValidationJobResponse>('/v1/verify/files', {
      body: formData,
      authMode: 'secret'
    });
  }

  async listBulk(params: ListBulkEmailValidationsParams = {}): Promise<ListBulkEmailValidationsResponse> {
    return this.http.get<ListBulkEmailValidationsResponse>('/v1/verify/files', {
      query: params,
      authMode: 'secret'
    });
  }

  async getBulk(jobId: string): Promise<BulkEmailValidationJobResponse> {
    return this.http.get<BulkEmailValidationJobResponse>(`/v1/verify/files/${encodeURIComponent(jobId)}`, {
      authMode: 'secret'
    });
  }

  async continueBulk(jobId: string): Promise<BulkEmailValidationJobResponse> {
    return this.http.post<BulkEmailValidationJobResponse>(
      `/v1/verify/files/${encodeURIComponent(jobId)}/continue`,
      {
        authMode: 'secret'
      }
    );
  }

  async downloadBulk(jobId: string, params: DownloadBulkEmailValidationParams = {}): Promise<ArrayBuffer> {
    return this.http.get<ArrayBuffer>(`/v1/verify/files/${encodeURIComponent(jobId)}/download`, {
      query: params,
      authMode: 'secret',
      responseType: 'arrayBuffer'
    });
  }

  async deleteBulk(jobId: string): Promise<DeleteBulkEmailValidationResponse> {
    return this.http.delete<DeleteBulkEmailValidationResponse>(`/v1/verify/files/${encodeURIComponent(jobId)}`, {
      authMode: 'secret'
    });
  }

  async getCredits(): Promise<VerificationCreditsResponse> {
    return this.http.get<VerificationCreditsResponse>('/v1/verification-credits', {
      authMode: 'secret'
    });
  }

  async listCreditLedger(
    params: ListVerificationCreditLedgerParams = {}
  ): Promise<ListVerificationCreditLedgerResponse> {
    return this.http.get<ListVerificationCreditLedgerResponse>('/v1/verification-credits/ledger', {
      query: params,
      authMode: 'secret'
    });
  }
}
