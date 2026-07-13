import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { isValidCourseId, normalizeCourseId } from '@/lib/courseIds';

const KUALI_API_BASE = 'https://snhu.kuali.co/api/v1/catalog';

async function fetchCourses(query = '') {
    const url = `${KUALI_API_BASE}/courses/6349a3f9164d00001c6c80da?q=${query}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
}

async function fetchCourseDetails(pid: string) {
    const url = `${KUALI_API_BASE}/course/6349a3f9164d00001c6c80da/${pid}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
}

function extractPrerequisites(rulesHtml: string): string[] {
    if (!rulesHtml) return [];

    const $ = cheerio.load(rulesHtml);
    const seen = new Set<string>();
    const prerequisites: string[] = [];

    $('a').each((_, el) => {
        const text = $(el).text();
        const id = normalizeCourseId(text);
        if (!isValidCourseId(id) || seen.has(id)) {
            return;
        }
        seen.add(id);
        prerequisites.push(id);
    });

    return prerequisites;
}

function parseCredits(creditsData: unknown): number {
    if (!creditsData || typeof creditsData !== 'object') {
        return 0;
    }

    const data = creditsData as {
        value?: unknown;
        credits?: { min?: unknown };
        min?: unknown;
    };

    try {
        if (data.value !== undefined && data.value !== null) {
            const n = parseFloat(String(data.value));
            return Number.isFinite(n) ? n : 0;
        }
        if (data.credits?.min !== undefined) {
            const n = parseFloat(String(data.credits.min));
            return Number.isFinite(n) ? n : 0;
        }
        if (data.min !== undefined) {
            const n = parseFloat(String(data.min));
            return Number.isFinite(n) ? n : 0;
        }
    } catch (e) {
        console.error('Error parsing credits:', e, creditsData);
    }
    return 0;
}

interface ParsedCourse {
    course_id: string;
    academic_level: string;
    translated_level: string;
    passed_catalog_query: string;
    start_date: string;
    online_offering: boolean;
    campus_offering: boolean;
    pid: string;
    course_uuid: string;
    title: string;
    subject_code: string;
    subject_description: string;
    translated_subject: string;
    subject_id: string;
    activation_date: string;
    score: number;
    description: string;
    credits: number;
    prerequisites: string[];
}

export async function GET() {
    let client;
    try {
        client = await db.connect();
    } catch (e) {
        console.error('Database connection error:', e);
        return NextResponse.json(
            { error: 'Failed to connect to the database. Ensure POSTGRES_URL is set.' },
            { status: 500 }
        );
    }

    try {
        console.log('Fetching all courses...');
        const courses = await fetchCourses('');
        if (!courses) {
            return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
        }

        console.log(`Found ${courses.length} courses.`);

        const courseSubset = courses.slice(0, 1500);
        const parsedCourses: ParsedCourse[] = [];

        // Fetch and parse remote data outside transactions.
        for (const data of courseSubset) {
            const course_id = data.__catalogCourseId;
            const academic_level = data.academicLevel?.name || '';
            const translated_level = data.academicLevel?.translatedNames?.es || '';
            const passed_catalog_query = String(data.__passedCatalogQuery || '');
            const start_date = data.dateStart || '';

            let online_offering = false;
            let campus_offering = false;
            if (data.offering) {
                online_offering = !!data.offering.online;
                campus_offering = !!data.offering.campus;
            }

            const pid = data.pid;
            const course_uuid = data.id;
            const title = data.title;
            const subject_code = data.subjectCode?.name || '';
            const subject_description = data.subjectCode?.description || '';
            const translated_subject = data.subjectCode?.translatedNames?.es || '';
            const subject_id = data.subjectCode?.id || '';
            const activation_date = data.catalogActivationDate || '';
            const score = data._score || 0.0;

            console.log(`Fetching details for course ${pid}`);
            const details = await fetchCourseDetails(pid);
            if (!details) continue;

            parsedCourses.push({
                course_id,
                academic_level,
                translated_level,
                passed_catalog_query,
                start_date,
                online_offering,
                campus_offering,
                pid,
                course_uuid,
                title,
                subject_code,
                subject_description,
                translated_subject,
                subject_id,
                activation_date,
                score,
                description: details.description || '',
                credits: parseCredits(details.credits),
                prerequisites: extractPrerequisites(details.rulesPrerequisites),
            });
        }

        // Short per-course transactions: upsert course rows and replace prerequisites.
        for (const course of parsedCourses) {
            try {
                await client.query('BEGIN');

                await client.sql`
                    INSERT INTO courses (
                        course_id, academic_level, translated_level, passed_catalog_query, start_date,
                        online_offering, campus_offering, pid, course_uuid, title, subject_code,
                        subject_description, translated_subject, subject_id, activation_date, score
                    ) VALUES (
                        ${course.course_id}, ${course.academic_level}, ${course.translated_level},
                        ${course.passed_catalog_query}, ${course.start_date},
                        ${course.online_offering}, ${course.campus_offering}, ${course.pid},
                        ${course.course_uuid}, ${course.title}, ${course.subject_code},
                        ${course.subject_description}, ${course.translated_subject},
                        ${course.subject_id}, ${course.activation_date}, ${course.score}
                    )
                    ON CONFLICT (pid) DO UPDATE SET
                        course_id = EXCLUDED.course_id,
                        academic_level = EXCLUDED.academic_level,
                        translated_level = EXCLUDED.translated_level,
                        passed_catalog_query = EXCLUDED.passed_catalog_query,
                        start_date = EXCLUDED.start_date,
                        online_offering = EXCLUDED.online_offering,
                        campus_offering = EXCLUDED.campus_offering,
                        course_uuid = EXCLUDED.course_uuid,
                        title = EXCLUDED.title,
                        subject_code = EXCLUDED.subject_code,
                        subject_description = EXCLUDED.subject_description,
                        translated_subject = EXCLUDED.translated_subject,
                        subject_id = EXCLUDED.subject_id,
                        activation_date = EXCLUDED.activation_date,
                        score = EXCLUDED.score;
                `;

                await client.sql`
                    INSERT INTO courses_data (
                        pid, title, catalog_course_id, description, academic_level,
                        credits, date_start, online_offering, campus_offering, subject_code
                    ) VALUES (
                        ${course.pid}, ${course.title}, ${course.course_id}, ${course.description},
                        ${course.academic_level}, ${course.credits}, ${course.start_date},
                        ${course.online_offering}, ${course.campus_offering}, ${course.subject_code}
                    )
                    ON CONFLICT (pid) DO UPDATE SET
                        title = EXCLUDED.title,
                        catalog_course_id = EXCLUDED.catalog_course_id,
                        description = EXCLUDED.description,
                        academic_level = EXCLUDED.academic_level,
                        credits = EXCLUDED.credits,
                        date_start = EXCLUDED.date_start,
                        online_offering = EXCLUDED.online_offering,
                        campus_offering = EXCLUDED.campus_offering,
                        subject_code = EXCLUDED.subject_code;
                `;

                await client.sql`
                    DELETE FROM prerequisites WHERE class_id = ${course.pid};
                `;

                for (const prereqId of course.prerequisites) {
                    await client.sql`
                        INSERT INTO prerequisites (class_id, course_id)
                        VALUES (${course.pid}, ${prereqId});
                    `;
                }

                await client.query('COMMIT');
            } catch (courseError) {
                await client.query('ROLLBACK');
                console.error(`Error writing course ${course.pid}:`, courseError);
            }
        }

        return NextResponse.json({
            message: `Successfully updated ${parsedCourses.length} courses`,
        });
    } catch (e) {
        console.error('Error updating courses', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
