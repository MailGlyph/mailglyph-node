import { afterEach, describe, expect, it, vi } from 'vitest';

import MailGlyph, { NotFoundError, ValidationError } from '../../src';
import { getRequest, installFetchMock, jsonResponse } from './test-utils';

const job = {
  id: '8a607588-1d7c-4d4f-9807-2a625fb20b14',
  status: 'COMPLETED',
  originalFilename: 'emails.csv',
  fileSizeBytes: 38,
  localEmailCount: 2,
  reservedCredits: 2,
  confirmedEmailCount: 2,
  creditUsed: 2,
  valid: 1,
  invalid: 1,
  unknown: 0,
  catchall: 0,
  duplicates: 0,
  spamTrap: 0,
  toxicDomains: 0,
  readyForDownload: true,
  errorCode: null,
  errorMessage: null,
  lastValidationStatus: 'finished',
  createdAt: '2026-06-18T10:12:30.000Z',
  updatedAt: '2026-06-18T10:14:05.000Z',
  completedAt: '2026-06-18T10:14:05.000Z'
} as const;

describe('verification resource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('validate() posts to /v1/verify and returns enhanced validation fields', async () => {
    const fetchMock = installFetchMock([
      jsonResponse({
        success: true,
        data: {
          email: 'user@example.com',
          valid: true,
          validationMethod: 'smtp',
          smtpStatus: 'Valid',
          smtpDiagnosis: 'Mailbox accepted',
          isDisposable: false,
          isAlias: false,
          isTypo: false,
          isPlusAddressed: false,
          isRandomInput: false,
          isPersonalEmail: false,
          isCatchAll: false,
          isGreylisted: false,
          domainExists: true,
          hasWebsite: true,
          hasMxRecords: true,
          suggestedEmail: null,
          reasons: ['Email appears to be valid'],
          creditsConsumed: 1
        }
      })
    ]);
    const client = new MailGlyph('sk_test_123');

    const result = await client.verification.validate('user@example.com');

    expect(result.data.validationMethod).toBe('smtp');
    expect(result.data.smtpStatus).toBe('Valid');
    expect(result.data.creditsConsumed).toBe(1);
    const { url, init } = getRequest(fetchMock);
    expect(url).toBe('https://api.mailglyph.com/v1/verify');
    expect(JSON.parse(String(init.body))).toEqual({ email: 'user@example.com' });
  });

  it('createBulk() uploads a file with multipart/form-data', async () => {
    const fetchMock = installFetchMock([jsonResponse({ success: true, data: job }, 202)]);
    const client = new MailGlyph('sk_test_123');

    const result = await client.verification.createBulk({
      file: new Blob(['one@example.com\ntwo@example.com\n'], { type: 'text/csv' }),
      filename: 'emails.csv'
    });

    expect(result.data.id).toBe(job.id);
    const { url, init } = getRequest(fetchMock);
    expect(url).toBe('https://api.mailglyph.com/v1/verify/files');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('listBulk() sends pagination and filter query params', async () => {
    const fetchMock = installFetchMock([
      jsonResponse({ success: true, data: { items: [job], nextCursor: 'next_123' } })
    ]);
    const client = new MailGlyph('sk_test_123');

    const result = await client.verification.listBulk({
      limit: 10,
      cursor: 'cur_123',
      search: 'emails',
      status: 'COMPLETED'
    });

    expect(result.data.items).toHaveLength(1);
    const { url } = getRequest(fetchMock);
    expect(url).toBe(
      'https://api.mailglyph.com/v1/verify/files?limit=10&cursor=cur_123&search=emails&status=COMPLETED'
    );
  });

  it('getBulk(), continueBulk(), and deleteBulk() call the job endpoints', async () => {
    const fetchMock = installFetchMock([
      jsonResponse({ success: true, data: job }),
      jsonResponse({ success: true, data: { ...job, status: 'QUEUED', readyForDownload: false } }),
      jsonResponse({ success: true, data: { refundedCredits: 2 } })
    ]);
    const client = new MailGlyph('sk_test_123');

    await expect(client.verification.getBulk(job.id)).resolves.toMatchObject({ data: { id: job.id } });
    await expect(client.verification.continueBulk(job.id)).resolves.toMatchObject({ data: { status: 'QUEUED' } });
    await expect(client.verification.deleteBulk(job.id)).resolves.toMatchObject({ data: { refundedCredits: 2 } });

    expect(getRequest(fetchMock, 0).url).toBe(`https://api.mailglyph.com/v1/verify/files/${job.id}`);
    expect(getRequest(fetchMock, 1).url).toBe(`https://api.mailglyph.com/v1/verify/files/${job.id}/continue`);
    expect(getRequest(fetchMock, 2).url).toBe(`https://api.mailglyph.com/v1/verify/files/${job.id}`);
    expect(getRequest(fetchMock, 1).init.method).toBe('POST');
    expect(getRequest(fetchMock, 2).init.method).toBe('DELETE');
  });

  it('downloadBulk() returns an ArrayBuffer for result files', async () => {
    const fetchMock = installFetchMock([
      new Response('email,status\none@example.com,Valid\n', {
        status: 200,
        headers: { 'content-type': 'text/csv' }
      })
    ]);
    const client = new MailGlyph('sk_test_123');

    const buffer = await client.verification.downloadBulk(job.id, { filter: 'valid', format: 'csv' });

    expect(new TextDecoder().decode(buffer)).toContain('one@example.com,Valid');
    expect(getRequest(fetchMock).url).toBe(
      `https://api.mailglyph.com/v1/verify/files/${job.id}/download?filter=valid&format=csv`
    );
  });

  it('getCredits() and listCreditLedger() return credit data', async () => {
    const fetchMock = installFetchMock([
      jsonResponse({ success: true, data: { balance: 4820, lowCredits: false } }),
      jsonResponse({
        success: true,
        data: {
          items: [
            {
              id: '2f4c658f-4b5b-4a19-8d52-36f22d6f4566',
              seq: 9182,
              type: 'CONSUME',
              creditsDelta: -1,
              balanceAfter: 4820,
              source: 'single_api',
              status: 'Valid',
              createdAt: '2026-06-17T10:15:30.000Z'
            }
          ],
          nextCursor: '9181'
        }
      })
    ]);
    const client = new MailGlyph('sk_test_123');

    await expect(client.verification.getCredits()).resolves.toMatchObject({ data: { balance: 4820 } });
    await expect(client.verification.listCreditLedger({ limit: 1, cursor: '9182' })).resolves.toMatchObject({
      data: { nextCursor: '9181' }
    });

    expect(getRequest(fetchMock, 0).url).toBe('https://api.mailglyph.com/v1/verification-credits');
    expect(getRequest(fetchMock, 1).url).toBe(
      'https://api.mailglyph.com/v1/verification-credits/ledger?limit=1&cursor=9182'
    );
  });

  it('maps validation and not found errors', async () => {
    installFetchMock([jsonResponse({ message: 'Invalid email format' }, 400)]);
    const client = new MailGlyph('sk_test_123');

    await expect(client.verification.validate('bad')).rejects.toBeInstanceOf(ValidationError);

    installFetchMock([jsonResponse({ message: 'Job not found' }, 404)]);
    const nextClient = new MailGlyph('sk_test_123');
    await expect(nextClient.verification.getBulk(job.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
