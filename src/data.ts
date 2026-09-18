import type { CourseData } from "./logic/types";
import syllabusData from "./data/syllabus.json";
import reviewsBitData from "./data/reviews_bit.json";
import reviewsTextData from "./data/reviews_text.json";

const bitMap = new Map<string, number>(
    (reviewsBitData as { id: string; rb: number }[]).map(r => [r.id, r.rb])
);
const commentMap = new Map<string, string>(
    (reviewsTextData as { id: string; comment: string }[]).map(r => [r.id, r.comment])
);

// Provide type assertion since imported JSON meets structural requirements, enriched with review data
export const MOCK_COURSES: CourseData[] = (syllabusData as CourseData[]).map(course => ({
    ...course,
    reviews_bit: course.reviews_bit ?? bitMap.get(course.id_name),
    comment: course.comment ?? commentMap.get(course.id_name)
}));

