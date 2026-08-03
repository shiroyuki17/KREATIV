import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/env.js', () => ({
  config: {
    QPAY_BASE_URL: 'https://merchant.qpay.mn',
    QPAY_USERNAME: 'test-user',
    QPAY_PASSWORD: 'test-pass',
    QPAY_INVOICE_CODE: 'TEST_INVOICE_CODE',
    QPAY_CALLBACK_URL: 'https://kreativ-backend.onrender.com/payments/qpay/callback',
  },
}));

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

// qpay.js кэшлэгддэг access token-ыг модулийн дотор хадгалдаг тул тест бүр
// хоорондоо саад болохгүйн тулд тест бүрд шинэ модуль instance ачаална.
let qpay;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  qpay = await import('./qpay.js');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('qpay client', () => {
  it('isConfigured is true when all QPay env vars are present', () => {
    expect(qpay.isConfigured()).toBe(true);
  });

  it('authenticates with Basic auth using QPAY_USERNAME/PASSWORD before creating an invoice', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-1', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ invoice_id: 'inv-123', qr_text: 'qr-payload', qr_image: 'base64...', urls: [] }));

    const result = await qpay.createInvoice({ amount: 500, senderInvoiceNo: 'tx-1', description: 'test deposit' });

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://merchant.qpay.mn/v2/auth/token', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: `Basic ${Buffer.from('test-user:test-pass').toString('base64')}` }),
    }));

    const [url, options] = global.fetch.mock.calls[1];
    expect(url).toBe('https://merchant.qpay.mn/v2/invoice');
    expect(options.headers.Authorization).toBe('Bearer tok-1');
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      invoice_code: 'TEST_INVOICE_CODE',
      sender_invoice_no: 'tx-1',
      amount: 500,
      callback_url: 'https://kreativ-backend.onrender.com/payments/qpay/callback',
    });

    expect(result).toEqual({ invoiceId: 'inv-123', qrText: 'qr-payload', qrImage: 'base64...', urls: [] });
  });

  it('reuses a cached access token instead of re-authenticating on every call', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-cached', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ invoice_id: 'inv-1', qr_text: 'q', qr_image: 'i', urls: [] }))
      .mockResolvedValueOnce(jsonResponse({ invoice_id: 'inv-2', qr_text: 'q', qr_image: 'i', urls: [] }));

    await qpay.createInvoice({ amount: 100, senderInvoiceNo: 'tx-a' });
    await qpay.createInvoice({ amount: 200, senderInvoiceNo: 'tx-b' });

    // 1 auth call + 2 invoice calls = 3, NOT 4 (no re-auth on the second invoice)
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('checkPayment reports paid=true only when a row has payment_status PAID', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-2', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ rows: [{ payment_status: 'NEW' }] }));

    const unpaid = await qpay.checkPayment('inv-999');
    expect(unpaid.paid).toBe(false);

    global.fetch.mockResolvedValueOnce(jsonResponse({ rows: [{ payment_status: 'PAID' }] }));
    const paid = await qpay.checkPayment('inv-999');
    expect(paid.paid).toBe(true);
  });

  it('throws a descriptive error when QPay auth fails', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ error: 'invalid credentials' }, false, 401));
    await expect(qpay.createInvoice({ amount: 10, senderInvoiceNo: 'tx-x' })).rejects.toThrow(/QPay auth амжилтгүй/);
  });
});
