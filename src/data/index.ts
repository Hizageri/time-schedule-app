import type { CourseConditionsFile, CourseData } from "../types";
import { isTestUniversity } from "../config/currentUniversity";
import syllabusData from "./syllabus.json";
import courseConditionsData from "./course_conditions.json";
import reviewsBitData from "./reviews_bit.json";
import reviewsTextData from "./reviews_text.json";
import testUniversityCourses from "./test_university/courses.json";

const bitMap = new Map<string, number>(
    (reviewsBitData as { id: string; rb: number }[]).map(r => [r.id, r.rb])
);
const commentMap = new Map<string, string>(
    (reviewsTextData as { id: string; comment: string }[]).map(r => [r.id, r.comment])
);
// 共通の形の科目の条件（生成物。npm run build:syllabus で syllabus.json から作る）
const conditionsMap = courseConditionsData as CourseConditionsFile;

/** 会津大学の科目：シラバスに、口コミと共通の形の条件を結合する */
const buildAizuCourses = (): CourseData[] =>
    (syllabusData as CourseData[]).map(course => {
        const conditions = conditionsMap[course.id_name];
        return {
            ...course,
            reviews_bit: course.reviews_bit ?? bitMap.get(course.id_name),
            comment: course.comment ?? commentMap.get(course.id_name),
            conditions: conditions?.course,
            classes: course.classes.map(cls => ({ ...cls, conditions: conditions?.classes?.[cls.class_id] })),
        };
    });

/** 今の大学の科目（試しの大学は、開発サーバーで VITE_UNIVERSITY=test のときだけ） */
export const MOCK_COURSES: CourseData[] = isTestUniversity
    ? (testUniversityCourses as CourseData[])
    : buildAizuCourses();

const coursesById = new Map(MOCK_COURSES.map(course => [course.id_name, course]));

/** 科目 ID から今の大学の科目データを引く（保存データの選んだ科目の複製には、条件がないことがある） */
export const findCourse = (courseId: string): CourseData | undefined => coursesById.get(courseId);
