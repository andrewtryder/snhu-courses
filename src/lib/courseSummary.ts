export interface CourseSummaryInput {
    courseId: string;
    directPrerequisiteCount: number;
    totalPrerequisiteCount: number;
    dependentCount: number;
}

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
    return count === 1 ? singular : plural;
}

/**
 * Compact, data-driven summary for the course page header line.
 * Does not invent data; handles singular/plural and zero counts.
 */
export function buildCourseSummary({
    courseId,
    directPrerequisiteCount,
    totalPrerequisiteCount,
    dependentCount,
}: CourseSummaryInput): string {
    const label = `SNHU ${courseId}`;
    const treeExceedsDirect = totalPrerequisiteCount > directPrerequisiteCount;

    let prereqPart: string;
    if (directPrerequisiteCount === 0) {
        prereqPart = 'has no listed prerequisites';
    } else if (treeExceedsDirect) {
        prereqPart = `has ${directPrerequisiteCount} direct ${pluralize(directPrerequisiteCount, 'prerequisite')}, with ${totalPrerequisiteCount} ${pluralize(totalPrerequisiteCount, 'course')} in its complete prerequisite tree`;
    } else {
        prereqPart = `has ${directPrerequisiteCount} direct ${pluralize(directPrerequisiteCount, 'prerequisite')}`;
    }

    if (dependentCount === 0) {
        return `${label} ${prereqPart}.`;
    }

    const dependentPart = `is required by ${dependentCount} other ${pluralize(dependentCount, 'course')}`;

    if (directPrerequisiteCount === 0) {
        return `${label} ${prereqPart} and ${dependentPart}.`;
    }

    if (treeExceedsDirect) {
        return `${label} ${prereqPart}, and ${dependentPart}.`;
    }

    return `${label} ${prereqPart} and ${dependentPart}.`;
}
