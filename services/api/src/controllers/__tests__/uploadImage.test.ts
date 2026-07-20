import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import { uploadImage, uploadSettlementProof } from '../merchantController.js';
import { v2 as cloudinary } from 'cloudinary';

// Mock cloudinary library
vi.mock('cloudinary', () => {
  const mockUpload = vi.fn(async (file: string, options: any) => {
    if (file.includes('fail')) {
      throw new Error('Upload error');
    }
    return { secure_url: `https://cloudinary.mock/${options.folder}/test-image.jpg` };
  });

  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload: mockUpload,
      },
    },
  };
});

vi.mock('../../lib/env.js', () => ({
  appConfig: { nodeEnv: 'test', isDev: false, port: 5000, allowedOrigins: [] },
  clerkConfig: { publishableKey: '', secretKey: 'test-secret', webhookSecret: 'test-webhook' },
  mongoConfig: { uri: 'mongodb://localhost/test' },
  redisConfig: { url: 'redis://localhost:6379' },
  cloudinaryConfig: { cloudName: 'test', apiKey: 'test', apiSecret: 'test' },
  smsConfig: { key: '', id: '' },
  orsConfig: { apiKey: 'test' },
}));

function makeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(body: any): AuthRequest {
  return {
    body,
    user: { _id: 'rider-123', role: 'RIDER' },
  } as unknown as AuthRequest;
}

describe('uploadImage controller & backward compatibility tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with status 400 if imageBase64 is missing', async () => {
    const req = makeReq({ documentType: 'license' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No image provided.' });
  });

  it('handles upload errors gracefully with status 500', async () => {
    const req = makeReq({ imageBase64: 'fail', documentType: 'license' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Image upload failed.' });
  });

  it('routes license documentType to ethio-logistics/kyc/license', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...', documentType: 'license' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/kyc/license' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ url: 'https://cloudinary.mock/ethio-logistics/kyc/license/test-image.jpg' });
  });

  it('routes national-id documentType to ethio-logistics/kyc/national-id', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...', documentType: 'national-id' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/kyc/national-id' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('routes vehicle documentType to ethio-logistics/kyc/vehicle', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...', documentType: 'vehicle' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/kyc/vehicle' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('routes profile documentType to ethio-logistics/profile', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...', documentType: 'profile' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/profile' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('routes settlement documentType to ethio-logistics/settlements', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...', documentType: 'settlement' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/settlements' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('defaults folder to settlements if documentType is not provided (backward compatibility check)', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...' });
    const res = makeRes();

    await uploadImage(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/settlements' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('supports the backward-compatible uploadSettlementProof alias', async () => {
    const req = makeReq({ imageBase64: 'someBase64Data...' });
    const res = makeRes();

    await uploadSettlementProof(req, res);

    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringContaining('someBase64Data...'),
      expect.objectContaining({ folder: 'ethio-logistics/settlements' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
