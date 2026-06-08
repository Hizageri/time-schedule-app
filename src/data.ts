import type { CourseData } from "./logic/types";
import syllabusData from "./data/syllabus.json";

// Provide type assertion since imported JSON meets the structural requirements
export const MOCK_COURSES: CourseData[] = syllabusData as CourseData[];
