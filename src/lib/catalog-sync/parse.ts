import * as cheerio from 'cheerio';
import { isValidCourseId, normalizeCourseId } from '@/lib/courseIds';
import type { KualiCourseDetails, KualiCourseListItem } from './fetch';

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

export function parseCourse(
  data: KualiCourseListItem,
  details: KualiCourseDetails
): ParsedCourse {
  let online_offering = false;
  let campus_offering = false;
  if (data.offering) {
    online_offering = !!data.offering.online;
    campus_offering = !!data.offering.campus;
  }

  return {
    course_id: data.__catalogCourseId || '',
    academic_level: data.academicLevel?.name || '',
    translated_level: data.academicLevel?.translatedNames?.es || '',
    passed_catalog_query: String(data.__passedCatalogQuery || ''),
    start_date: data.dateStart || '',
    online_offering,
    campus_offering,
    pid: data.pid,
    course_uuid: data.id || '',
    title: data.title || '',
    subject_code: data.subjectCode?.name || '',
    subject_description: data.subjectCode?.description || '',
    translated_subject: data.subjectCode?.translatedNames?.es || '',
    subject_id: data.subjectCode?.id || '',
    activation_date: data.catalogActivationDate || '',
    score: data._score || 0.0,
    description: details.description || '',
    credits: parseCredits(details.credits),
    prerequisites: extractPrerequisites(details.rulesPrerequisites || ''),
  };
}
