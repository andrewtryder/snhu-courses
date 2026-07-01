import { ImageResponse } from 'next/og';
import { getCourseById } from '@/lib/courses';

export const alt = 'SNHU Course Prerequisites';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const courseId = id.toUpperCase();
    const course = await getCourseById(courseId);
    const title = course?.title ?? 'Course Prerequisites';

    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: '64px',
                    background: 'linear-gradient(135deg, #001d59 0%, #003087 100%)',
                    color: '#ffffff',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div
                    style={{
                        fontSize: 56,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        marginBottom: 16,
                    }}
                >
                    {courseId}
                </div>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 500,
                        color: '#b4c5ff',
                        marginBottom: 48,
                        maxWidth: '90%',
                        lineHeight: 1.3,
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: '#dbe1ff',
                        borderTop: '2px solid #3959b0',
                        paddingTop: 32,
                    }}
                >
                    SNHU Course Prerequisites Tool
                </div>
            </div>
        ),
        { ...size }
    );
}
