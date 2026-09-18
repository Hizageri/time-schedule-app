import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawReviewsPath = path.join(__dirname, '../src/data/raw_reviews.json');
const syllabusPath = path.join(__dirname, '../src/data/syllabus.json');
const reviewsBitOutputPath = path.join(__dirname, '../src/data/reviews_bit.json');
const reviewsTextOutputPath = path.join(__dirname, '../src/data/reviews_text.json'); // 追加: テキスト用
const promptListOutputPath = path.join(__dirname, '../src/data/course_list_for_prompt.md');

// 1. Bit Encoding & Text Extraction Process
if (!fs.existsSync(rawReviewsPath)) {
    console.error(`Error: Raw reviews file not found at ${rawReviewsPath}`);
    process.exit(1);
}

const rawReviews = JSON.parse(fs.readFileSync(rawReviewsPath, 'utf-8'));
const reviewsBit = [];
const reviewsText = []; // 追加: テキストを貯める配列

rawReviews.forEach(item => {
    const { id, difficulty, assignment, exam, attendance, comment } = item;
    
    // 12ビット整数にエンコード
    const rb = (attendance << 9) | (exam << 6) | (assignment << 3) | difficulty;
    reviewsBit.push({ id, rb });

    // 口コミテキストが存在する場合のみ、reviews_text.json 用に抽出
    if (comment && comment.trim() !== "") {
        reviewsText.push({ id, comment });
    }
});

// ファイル書き出し
fs.writeFileSync(reviewsBitOutputPath, JSON.stringify(reviewsBit, null, 2), 'utf-8');
fs.writeFileSync(reviewsTextOutputPath, JSON.stringify(reviewsText, null, 2), 'utf-8'); // 追加

console.log(`[Success] Encoded ${reviewsBit.length} courses into reviews_bit.json`);
console.log(`[Success] Extracted ${reviewsText.length} comments into reviews_text.json`); // 追加


// 2. Prompt Document Generation Process (変更なし)
if (fs.existsSync(syllabusPath)) {
    const syllabus = JSON.parse(fs.readFileSync(syllabusPath, 'utf-8'));

    function getTargetGrades(bit) {
        if (bit === undefined || bit === null) return [];
        const grades = [];
        for (let i = 0; i < 6; i++) {
            if ((bit & (1 << i)) > 0) grades.push(i + 1);
        }
        return grades;
    }

    function getPeriodLabel(bit) {
        if (bit === undefined || bit === null) return '不明';
        const term = (bit >> 8) & 0b11;
        const quarter = (bit >> 6) & 0b11;
        if (quarter === 0b11) return '集中';
        if (term === 0b00) {
            if (quarter === 0b00) return '1Q';
            if (quarter === 0b01) return '2Q';
            if (quarter === 0b10) return '前期';
        } else if (term === 0b01) {
            if (quarter === 0b00) return '3Q';
            if (quarter === 0b01) return '4Q';
            if (quarter === 0b10) return '後期';
        } else if (term === 0b10 && quarter === 0b10) {
            return '通年';
        }
        return '不明';
    }

    const syllabusMap = new Map();
    syllabus.forEach(course => {
        const bit = course.target_bit ?? course.classes?.[0]?.target_bit ?? 0;
        syllabusMap.set(course.id_name, {
            id_name: course.id_name,
            grades: getTargetGrades(bit),
            period: getPeriodLabel(bit)
        });
    });

    const gradeGroups = { 1: [], 2: [], 3: [], 4: [], other: [] };
    reviewsBit.forEach(item => {
        const info = syllabusMap.get(item.id) || { id_name: item.id, grades: [], period: '不明' };
        const minGrade = info.grades.length > 0 ? Math.min(...info.grades) : 'other';
        if (gradeGroups[minGrade]) gradeGroups[minGrade].push(info);
        else gradeGroups.other.push(info);
    });

    let mdContent = `# 全科目リスト（口コミデータ作成用）\n\n`;
    const gradeTitles = {
        1: '■ 1年生向け科目',
        2: '■ 2年生向け科目',
        3: '■ 3年生向け科目',
        4: '■ 4年生向け科目',
        other: '■ その他 / 全学年向け科目'
    };

    for (const [gradeKey, list] of Object.entries(gradeGroups)) {
        if (list.length === 0) continue;
        mdContent += `### ${gradeTitles[gradeKey]} (${list.length}件)\n`;
        list.forEach(c => {
            mdContent += `- ${c.id_name} (${c.period})\n`;
        });
        mdContent += `\n`;
    }

    fs.writeFileSync(promptListOutputPath, mdContent, 'utf-8');
    console.log(`[Success] Updated course_list_for_prompt.md`);
}