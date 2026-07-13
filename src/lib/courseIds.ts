/** Maximum number of course IDs accepted in a batch (API or SSR). */
export const MAX_COURSE_IDS = 10;

/** Catalog course IDs look like CS250, MATH142, ENG122H. */
const COURSE_ID_PATTERN = /^[A-Z]{1,6}\d{2,4}[A-Z]{0,2}$/;

export type CourseIdParseErrorCode = 'empty' | 'invalid' | 'too_many';

export interface CourseIdParseError {
    id?: string;
    code: CourseIdParseErrorCode;
    message: string;
}

export interface ParseCourseIdListResult {
    ids: string[];
    errors: CourseIdParseError[];
}

export function normalizeCourseId(raw: string): string {
    return raw.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function isValidCourseId(id: string): boolean {
    return COURSE_ID_PATTERN.test(id);
}

/**
 * Split a comma-separated list, normalize, validate, and deduplicate.
 * Malformed tokens and over-limit lists are reported in `errors`.
 * When any error is present, `ids` may still contain the valid subset
 * (callers that reject on any error should check `errors.length`).
 */
export function parseCourseIdList(
    input: string,
    options: { max?: number } = {}
): ParseCourseIdListResult {
    const max = options.max ?? MAX_COURSE_IDS;
    const errors: CourseIdParseError[] = [];
    const seen = new Set<string>();
    const ids: string[] = [];

    const tokens = input
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);

    if (tokens.length === 0) {
        return {
            ids: [],
            errors: [{ code: 'empty', message: 'No course IDs provided.' }],
        };
    }

    for (const token of tokens) {
        const id = normalizeCourseId(token);
        if (!isValidCourseId(id)) {
            errors.push({
                id: token,
                code: 'invalid',
                message: `Invalid course ID: ${token}`,
            });
            continue;
        }
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        ids.push(id);
    }

    if (ids.length > max) {
        errors.push({
            code: 'too_many',
            message: `At most ${max} course IDs are allowed (got ${ids.length}).`,
        });
        return { ids: ids.slice(0, max), errors };
    }

    return { ids, errors };
}
