import { describe, it, expect } from 'vitest';
import { generateStaticParams } from '../page';

describe('Course Page generateStaticParams', () => {
    it('returns an empty array so pages are generated on demand on first request', async () => {
        const params = await generateStaticParams();
        expect(params).toEqual([]);
    });
});
