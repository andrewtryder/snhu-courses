import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
}));

import { revalidateTag, revalidatePath } from 'next/cache';

describe('POST /api/revalidate', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('fails closed (500) if REVALIDATE_SECRET is missing', async () => {
        delete process.env.REVALIDATE_SECRET;

        const req = new Request('http://localhost/api/revalidate', {
            method: 'POST',
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: 'Revalidation endpoint is not configured.' });
        expect(revalidateTag).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('returns 401 if Authorization header is missing or invalid', async () => {
        process.env.REVALIDATE_SECRET = 'test-secret';

        const reqNoAuth = new Request('http://localhost/api/revalidate', {
            method: 'POST',
        });
        const resNoAuth = await POST(reqNoAuth);
        expect(resNoAuth.status).toBe(401);

        const reqWrongAuth = new Request('http://localhost/api/revalidate', {
            method: 'POST',
            headers: { Authorization: 'Bearer wrong-secret' },
        });
        const resWrongAuth = await POST(reqWrongAuth);
        expect(resWrongAuth.status).toBe(401);

        expect(revalidateTag).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('invalidates tag catalog-data (max) and specific catalog paths on success', async () => {
        process.env.REVALIDATE_SECRET = 'test-secret';

        const req = new Request('http://localhost/api/revalidate', {
            method: 'POST',
            headers: { Authorization: 'Bearer test-secret' },
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            revalidated: true,
            tag: 'catalog-data',
            paths: ['/courses', '/course/[id]', '/sitemap.xml'],
            revalidatedAt: expect.any(String),
        });

        expect(revalidateTag).toHaveBeenCalledTimes(1);
        expect(revalidateTag).toHaveBeenCalledWith('catalog-data', 'max');

        expect(revalidatePath).toHaveBeenCalledTimes(3);
        expect(revalidatePath).toHaveBeenCalledWith('/courses');
        expect(revalidatePath).toHaveBeenCalledWith('/course/[id]', 'page');
        expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');

        // Ensure '/' is not invalidated as layout or page
        expect(revalidatePath).not.toHaveBeenCalledWith('/', 'layout');
        expect(revalidatePath).not.toHaveBeenCalledWith('/');
    });
});
