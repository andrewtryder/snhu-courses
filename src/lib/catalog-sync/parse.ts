import * as cheerio from 'cheerio';
import { isValidCourseId, normalizeCourseId } from '@/lib/courseIds';
import type { KualiCourseDetails } from './fetch';

export interface ParsedCourse {
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

export function extractPrerequisites(rulesHtml: string): string[] {
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

export function parseCredits(creditsData: unknown): number {
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

/** Parse a course from the detail endpoint (includes list + detail fields). */
export function parseCourse(details: KualiCourseDetails, fallbackPid?: string): ParsedCourse {
  let online_offering = false;
  let campus_offering = false;
  if (details.offering) {
    online_offering = !!details.offering.online;
    campus_offering = !!details.offering.campus;
  }

  return {
    course_id: details.__catalogCourseId || '',
    academic_level: details.academicLevel?.name || '',
    translated_level: details.academicLevel?.translatedNames?.es || '',
    passed_catalog_query: String(details.__passedCatalogQuery || ''),
    start_date: details.dateStart || '',
    online_offering,
    campus_offering,
    pid: details.pid || fallbackPid || '',
    course_uuid: details.id || '',
    title: details.title || '',
    subject_code: details.subjectCode?.name || '',
    subject_description: details.subjectCode?.description || '',
    translated_subject: details.subjectCode?.translatedNames?.es || '',
    subject_id: details.subjectCode?.id || '',
    activation_date: details.catalogActivationDate || '',
    score: details._score || 0.0,
    description: details.description || '',
    credits: parseCredits(details.credits),
    prerequisites: extractPrerequisites(details.rulesPrerequisites || ''),
  };
}
