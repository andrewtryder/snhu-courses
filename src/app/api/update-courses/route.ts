import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

const KUALI_API_BASE = 'https://snhu.kuali.co/api/v1/catalog';

async function fetchCourses(query = "") {
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

function extractPrerequisites(rulesHtml: string) {
    const prerequisites: { course_id: string }[] = [];
    if (!rulesHtml) return prerequisites;

    // Equivalent to python regex: <a href=".*?">(\w+)</a>
    const regex = /<a href=".*?">(\w+)<\/a>/g;
    let match;
    while ((match = regex.exec(rulesHtml)) !== null) {
        prerequisites.push({ course_id: match[1] });
    }
    return prerequisites;
}

export async function GET() {
    let client;
    try {
        client = await db.connect();
    } catch (e) {
        console.error("Database connection error:", e);
        return NextResponse.json({ error: "Failed to connect to the database. Ensure POSTGRES_URL is set." }, { status: 500 });
    }

    try {
        console.log("Fetching all courses...");
        const courses = await fetchCourses("");
        if (!courses) {
            return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
        }

        console.log(`Found ${courses.length} courses.`);

        // Fetch more courses to include CS, IT, etc. (first 1500 instead of 50)
        // In real world, this might be a background job
        const courseSubset = courses.slice(0, 1500);

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

            await client.sql`
                INSERT INTO courses (
                    course_id, academic_level, translated_level, passed_catalog_query, start_date,
                    online_offering, campus_offering, pid, course_uuid, title, subject_code,
                    subject_description, translated_subject, subject_id, activation_date, score
                ) VALUES (
                    ${course_id}, ${academic_level}, ${translated_level}, ${passed_catalog_query}, ${start_date},
                    ${online_offering}, ${campus_offering}, ${pid}, ${course_uuid}, ${title}, ${subject_code},
                    ${subject_description}, ${translated_subject}, ${subject_id}, ${activation_date}, ${score}
                )
                ON CONFLICT (pid) DO NOTHING;
            `;

            console.log(`Fetching details for course ${pid}`);
            const details = await fetchCourseDetails(pid);
            if (!details) continue;

            const prerequisites = extractPrerequisites(details.rulesPrerequisites);

            let credits = 0;
            const credits_data = details.credits;
            if (credits_data) {
                try {
                    const credits_value = credits_data.value;
                    if (credits_value !== undefined && credits_value !== null) {
                        // Handle both numbers and strings (e.g., "1.5")
                        credits = Math.round(parseFloat(String(credits_value)) || 0);
                    } else if (credits_data.credits && credits_data.credits.min !== undefined) {
                        credits = Math.round(parseFloat(String(credits_data.credits.min)) || 0);
                    } else if (credits_data.min !== undefined) {
                        credits = Math.round(parseFloat(String(credits_data.min)) || 0);
                    }
                } catch (e) {
                    console.error('Error parsing credits:', e, credits_data);
                    credits = 0;
                }
            }

            const description = details.description || '';

            await client.sql`
                INSERT INTO courses_data (
                    pid, title, catalog_course_id, description, academic_level,
                    credits, date_start, online_offering, campus_offering, subject_code
                ) VALUES (
                    ${pid}, ${title}, ${course_id}, ${description}, ${academic_level},
                    ${credits}, ${start_date}, ${online_offering}, ${campus_offering}, ${subject_code}
                )
                ON CONFLICT (pid) DO NOTHING;
            `;

            for (const prereq of prerequisites) {
                await client.sql`
                    INSERT INTO prerequisites (class_id, course_id)
                    VALUES (${pid}, ${prereq.course_id})
                    ON CONFLICT (class_id, course_id) DO NOTHING;
                `;
            }
        }

        return NextResponse.json({ message: `Successfully updated ${courseSubset.length} courses` });

    } catch (e) {
        console.error("Error updating courses", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    } finally {
        if (client) {
            client.release();
        }
    }
}
