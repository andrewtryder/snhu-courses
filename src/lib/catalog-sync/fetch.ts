const KUALI_API_BASE = 'https://snhu.kuali.co/api/v1/catalog';
const CATALOG_ID = '6349a3f9164d00001c6c80da';

export interface KualiCourseListItem {
  __catalogCourseId?: string;
  academicLevel?: {
    name?: string;
    translatedNames?: { es?: string };
  };
  __passedCatalogQuery?: boolean;
  dateStart?: string;
  offering?: {
    online?: boolean;
    campus?: boolean;
  };
  pid: string;
  id?: string;
  title?: string;
  subjectCode?: {
    name?: string;
    description?: string;
    translatedNames?: { es?: string };
    id?: string;
  };
  catalogActivationDate?: string;
  _score?: number;
}

export interface KualiCourseDetails {
  description?: string;
  credits?: unknown;
  rulesPrerequisites?: string;
}

export async function fetchCourses(query = ''): Promise<KualiCourseListItem[] | null> {
  const url = `${KUALI_API_BASE}/courses/${CATALOG_ID}?q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json() as Promise<KualiCourseListItem[]>;
}

export async function fetchCourseDetails(
  pid: string,
  retries = 2
): Promise<KualiCourseDetails | null> {
  const url = `${KUALI_API_BASE}/course/${CATALOG_ID}/${pid}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json() as Promise<KualiCourseDetails>;
      }
    } catch {
      // retry below
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  return null;
}
