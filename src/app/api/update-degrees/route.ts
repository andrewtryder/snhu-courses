import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
    const url = "https://snhu.kuali.co/api/v1/catalog/program/6349a3f9164d00001c6c80da/V1S14E8tg";

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch degrees" }, { status: 500 });
        }
        const jsonData = await response.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = [];

        if (jsonData.rulesRequirements) {
            const $ = cheerio.load(jsonData.rulesRequirements);

            $('header[data-test^="grouping-"]').each((_, header) => {
                const spanElements = $(header).find('span');

                if (spanElements.length >= 3) {
                    const reqType = $(spanElements[0]).text().trim();
                    const creditsText = $(spanElements[1]).text().trim();
                    // const tc = $(spanElements[2]).text().trim();

                    if (reqType.startsWith("Major Electives")) {
                        const parent = $(header).parent();
                        const divElement = parent.find('div[data-test="ruleView-A-result"]');
                        const divText = divElement.text();

                        let credits: string | null = null;
                        const creditsMatch = divText.match(/(\d+)\s*credit/);
                        if (creditsMatch) {
                            credits = creditsMatch[1];
                        }

                        let subjects: string[] | null = null;
                        const subjectsMatch = divText.match(/\b[A-Z]{2,3}\b/g);
                        if (subjectsMatch) {
                            subjects = subjectsMatch;
                        }

                        let courseRange: [string, string] | null = null;
                        const rangeMatch = divText.match(/(\d+)\s*-\s*(\d+)/);
                        if (rangeMatch) {
                            courseRange = [rangeMatch[1], rangeMatch[2]];
                        }

                        results.push({
                            reqType,
                            totalCredits: creditsText,
                            credits,
                            subjects,
                            courseRange,
                            rawText: divText
                        });
                    }
                }
            });
        }

        // Return parsed results
        return NextResponse.json({ success: true, results });
    } catch (e) {
        console.error("Error parsing degrees", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
