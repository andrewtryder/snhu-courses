import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  let client;
  try {
      client = await db.connect();
  } catch (e) {
      console.error("Database connection error:", e);
      return NextResponse.json({ error: "Failed to connect to the database. Ensure POSTGRES_URL is set." }, { status: 500 });
  }

  try {
    // Drop existing tables for fresh initialization if needed (comment out in production)
    await client.sql`DROP TABLE IF EXISTS prerequisites;`;
    await client.sql`DROP TABLE IF EXISTS courses_data;`;
    await client.sql`DROP TABLE IF EXISTS courses;`;

    await client.sql`
      CREATE TABLE IF NOT EXISTS courses (
        course_id TEXT,
        academic_level TEXT,
        translated_level TEXT,
        passed_catalog_query TEXT,
        start_date TEXT,
        online_offering BOOLEAN,
        campus_offering BOOLEAN,
        pid TEXT PRIMARY KEY,
        course_uuid TEXT,
        title TEXT,
        subject_code TEXT,
        subject_description TEXT,
        translated_subject TEXT,
        subject_id TEXT,
        activation_date TEXT,
        score REAL
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS courses_data (
        pid TEXT PRIMARY KEY,
        title TEXT,
        catalog_course_id TEXT,
        description TEXT,
        academic_level TEXT,
        credits INTEGER,
        date_start TEXT,
        online_offering BOOLEAN,
        campus_offering BOOLEAN,
        subject_code TEXT
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS prerequisites (
        class_id TEXT,
        course_id TEXT,
        course_title TEXT,
        course_credits TEXT,
        PRIMARY KEY (class_id, course_id),
        FOREIGN KEY (class_id) REFERENCES courses_data (pid) ON DELETE CASCADE
      );
    `;

    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  } finally {
    if (client) {
        client.release();
    }
  }
}
