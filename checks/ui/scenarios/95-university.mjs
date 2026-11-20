// 大学ごとの設定（university-config 4.1）：試しの大学（VITE_UNIVERSITY=test）で設定どおりに動くか、
// 会津大学で D が入った保存データが F と同じに扱われるか
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const testCourses = JSON.parse(fs.readFileSync(path.resolve(here, '../../../src/data/test_university/courses.json'), 'utf8'));
const testCourse = id => testCourses.find(c => c.id_name === id);
const json = body => route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const optionTexts = select => select.locator('option').evaluateAll(o => o.map(x => x.textContent.trim()));
const cardNames = page => page.locator('div.cursor-pointer h3').allTextContents();

export default {
    name: '大学ごとの設定',
    async run({ ok, open, flush, course, withTestUniversity }) {
        await withTestUniversity(async openTest => {
            const profile = { nickname: 'ため', dreamJob: '', university: '試し' };

            // 条件の画面：学年 1〜4、学期の名前、ベースクラス
            let page = await openTest({ uid: 't', docs: { 'users/t': { currentScreen: 2, userProfile: profile, timetableConditions: { targetGrade: 1, term: 'first', baseClass: 'A組' } } } });
            const selects = page.locator('select');
            ok((await optionTexts(selects.nth(0))).join(',') === '1年生,2年生,3年生,4年生', '試しの大学：学年の選択肢は 1〜4');
            ok((await optionTexts(selects.nth(1))).join(',') === '春学期,秋学期', '試しの大学：学期の選択肢は大学の設定の名前（2学期制）');
            ok((await optionTexts(selects.nth(2))).join(',') === 'A組,B組', '試しの大学：ベースクラスは大学の設定の選択肢');
            ok(page.errors.length === 0, `試しの大学：条件の画面のエラーがない（${page.errors}）`);
            await page.context().close();

            // 科目の絞り込み：1年・春学期 → T101・T102・T105・T109。秋学期 → T103・T105（T105 は春学期・秋学期のどちらかで受ける）
            page = await openTest({ uid: 't', docs: { 'users/t': { currentScreen: 3, userProfile: profile, timetableConditions: { targetGrade: 1, term: 'first', baseClass: 'A組' } } } });
            const firstTerm = (await cardNames(page)).sort().join(',');
            ok(firstTerm === 'T101 試しの基礎A,T102 試しの基礎B,T105 試しの選択講義,T109 試しの集中講義', `試しの大学：1年・春学期の科目（${firstTerm}）`);
            const labels = await page.locator('div.cursor-pointer span.bg-green-50').allTextContents();
            ok(labels.includes('春学期') && labels.includes('集中'), `試しの大学：開講時期は学期の名前（クォーターなし）と集中（${labels}）`);
            const eitherLabel = async () => (await page.locator('div.cursor-pointer', { has: page.locator('h3', { hasText: 'T105 試しの選択講義' }) }).locator('span.bg-green-50').textContent())?.trim();
            ok((await eitherLabel()) === '春学期・秋学期', '試しの大学：どちらかの学期で受ける科目の開講時期は「春学期・秋学期」');
            await page.context().close();
            page = await openTest({ uid: 't', docs: { 'users/t': { currentScreen: 3, userProfile: profile, timetableConditions: { targetGrade: 1, term: 'second', baseClass: 'A組' } } } });
            const secondTerm = (await cardNames(page)).sort().join(',');
            ok(secondTerm === 'T103 試しの演習,T105 試しの選択講義', `試しの大学：1年・秋学期の科目は T103 と、どちらかの学期で受ける T105（通年なし）（${secondTerm}）`);
            ok((await eitherLabel()) === '春学期・秋学期', '試しの大学：秋学期の一覧でも T105 は「春学期・秋学期」');
            await page.context().close();

            // 時間割の表示（生成のプレビュー）：月〜金・7限・クォーターの切りかえなし
            const A = testCourse('T101 試しの基礎A'); const B = testCourse('T102 試しの基礎B'); const C = testCourse('T103 試しの演習');
            page = await openTest({
                uid: 't',
                routes: { '/api/timetable-patterns': json({ patterns: [{ id: 'p1', name: 'パターン1', description: 'せつめい', assignments: [{ courseId: A.id_name, classId: 'B組' }] }] }) },
                docs: { 'users/t': { currentScreen: 5, userProfile: profile, timetableSettings: { workingDays: 6, maxPeriods: 7 }, timetableConditions: { targetGrade: 1, term: 'first', baseClass: 'A組' }, selectedCourses: [A, B, C], committedClasses: [] } },
            });
            await page.waitForTimeout(4000);
            const heads = (await page.locator('table').first().locator('thead th').allTextContents()).map(s => s.trim()).filter(s => s && s !== '時限');
            ok(heads.join(',') === '月,火,水,木,金', `試しの大学：曜日は月〜金（6日の設定でも土はない）（${heads}）`);
            ok((await page.locator('table').first().locator('tbody tr').count()) === 7, '試しの大学：7限まで表示する');
            ok((await page.locator('button', { hasText: /^Q\d表示$/ }).count()) === 0, '試しの大学：クォーターの切りかえがない');
            const cell = async (day, period) => {
                const col = heads.indexOf(day) + 1;
                return (await page.locator('table').first().locator('tbody tr').nth(period - 1).locator('td').nth(col).textContent()) ?? '';
            };
            ok((await cell('金', 7)).includes(B.id_name), '試しの大学：金曜7限に T102 が出る');
            ok((await cell('火', 1)).includes(A.id_name) && !(await cell('月', 1)).includes(A.id_name), '試しの大学：T101 はパターンの割り当て（B組・火曜1限）に出る');
            ok(!(await cell('水', 3)).includes(C.id_name), '試しの大学：秋学期の T103 は春学期のプレビューに出ない');
            ok(page.errors.length === 0, `試しの大学：生成の画面のエラーがない（${page.errors}）`);
            await page.context().close();

            // 成績の選択肢（S〜F）・GPA・プロフィールの大学名と学期制
            const grades = { [A.id_name]: { grade: 'S', classDifficulty: 3, testDifficulty: 3 }, [B.id_name]: { grade: 'C', classDifficulty: 3, testDifficulty: 3 } };
            page = await openTest({ uid: 't', docs: { 'users/t': { currentScreen: 7, userProfile: profile, selectedCourses: [A, B], grades } } });
            const gradeOptions = await optionTexts(page.locator('select').first());
            ok(gradeOptions.slice(1).join(',') === 'S (4 点),A (3 点),B (2 点),C (1 点),F (0 点)', `試しの大学：成績の選択肢は S〜F（${gradeOptions}）`);
            await page.context().close();
            page = await openTest({ uid: 't', docs: { 'users/t': { currentScreen: 6, userProfile: profile, timetableSettings: { workingDays: 6, maxPeriods: 5 }, selectedCourses: [A, B], grades } } });
            ok((await page.locator('table thead th').allTextContents()).map(s => s.trim()).filter(s => s && s !== '時限').join(',') === '月,火,水,木,金', '試しの大学：ダッシュボードの曜日も月〜金');
            ok((await page.locator('button', { hasText: /^Q\d$/ }).count()) === 0, '試しの大学：ダッシュボードにクォーターの切りかえがない');
            await page.locator('button', { hasText: /^成績$/ }).first().click();
            await page.locator('button', { hasText: 'GPAを計算する' }).click();
            await page.locator('button', { hasText: '確定してGPAを算出' }).click();
            const gpa = (await page.locator('text=現在のGPA').locator('xpath=following-sibling::div[1]').textContent())?.trim();
            ok(gpa === '2.50', `試しの大学：GPA は設定の段階で計算する（S=4 が 2単位・C=1 が 2単位 → 2.50）（${gpa}）`);
            await page.locator('button', { hasText: /^プロフィール$/ }).first().click();
            const profileText = await page.locator('main').textContent();
            ok(profileText.includes('試しの大学（開発用） (変更不可)') && profileText.includes('2学期制') && profileText.includes('S, A, B, C, F'), '試しの大学：プロフィールの大学名・学期制・成績評価システムは大学の設定');
            ok(page.errors.length === 0, `試しの大学：ダッシュボードのエラーがない（${page.errors}）`);
            await page.context().close();
        });

        // 会津大学：選んだ科目の保存データには、共通の形の条件（conditions）を入れない（保存の形を今までと同じに保つ）
        const profile = { nickname: 'でぃー', dreamJob: '', university: '会津大学' };
        let page = await open({ uid: 'd', docs: { 'users/d': { currentScreen: 3, userProfile: profile } } });
        const [first] = await cardNames(page);
        await page.locator('div.cursor-pointer input[type="checkbox"]').first().click();
        await page.waitForTimeout(200);
        const savedSelected = (await flush(page))['users/d'].selectedCourses;
        ok(savedSelected.length === 1 && savedSelected[0].id_name === first && !('conditions' in savedSelected[0]) && savedSelected[0].classes.every(c => !('conditions' in c)),
            '会津大学：選んだ科目の保存データに conditions が入らない（科目にもクラスにも）');
        await page.context().close();

        // 会津大学：D が入った保存データは F と同じ（0 ポイントの不合格）
        const dCourse = course(first);
        const aCourse = course('NS01 力学');
        const savedGrades = { [dCourse.id_name]: { grade: 'D', classDifficulty: 3, testDifficulty: 3 }, [aCourse.id_name]: { grade: 'A', classDifficulty: 3, testDifficulty: 3 } };
        const oldScale = [{ label: 'A', point: 4 }, { label: 'B', point: 3 }, { label: 'C', point: 2 }, { label: 'D', point: 0 }, { label: 'F', point: 0 }];
        page = await open({ uid: 'd', docs: { 'users/d': { currentScreen: 3, userProfile: { ...profile, gradingScale: oldScale }, grades: savedGrades } } });
        const dCard = page.locator('div.cursor-pointer', { has: page.locator('h3', { hasText: dCourse.id_name }) }).first();
        ok((await dCard.count()) === 1 && (await dCard.locator('text=再履修').count()) === 1, `会津大学：D の科目は不合格として一覧に残り、再履修の印が付く（${dCourse.id_name}）`);
        await page.context().close();

        page = await open({ uid: 'd', docs: { 'users/d': { currentScreen: 6, userProfile: { ...profile, gradingScale: oldScale }, selectedCourses: [dCourse, aCourse], grades: savedGrades } } });
        await page.locator('button', { hasText: /^成績$/ }).first().click();
        await page.locator('button', { hasText: 'GPAを計算する' }).click();
        const simulatorLabels = await page.locator('span.font-bold.text-foreground.text-sm').allTextContents();
        ok(simulatorLabels.join(',') === 'A,B,C,F', `会津大学：GPA シミュレーターの段階は A・B・C・F（保存データに D があっても）（${simulatorLabels}）`);
        await page.locator('button', { hasText: '確定してGPAを算出' }).click();
        const gpa = (await page.locator('text=現在のGPA').locator('xpath=following-sibling::div[1]').textContent())?.trim();
        const expected = ((aCourse.credits * 4) / (aCourse.credits + dCourse.credits)).toFixed(2);
        ok(gpa === expected, `会津大学：D の単位は F（0 ポイント）として GPA に入る（${gpa} / ${expected}）`);
        const earned = await page.locator('text=修得単位:').locator('xpath=following-sibling::span[1]').textContent();
        ok(earned?.trim() === `${aCourse.credits} / ${aCourse.credits + dCourse.credits}`, `会津大学：D の単位は修得単位に入らない（${earned}）`);
        await page.locator('button', { hasText: /^プロフィール$/ }).first().click();
        ok((await page.locator('main').textContent()).includes('A, B, C, F'), '会津大学：プロフィールの成績評価システムは A, B, C, F');
        await page.context().close();

        page = await open({ uid: 'd', docs: { 'users/d': { currentScreen: 7, userProfile: { ...profile, gradingScale: oldScale }, selectedCourses: [dCourse, aCourse], grades: savedGrades } } });
        const dSelect = page.locator('div.rounded-xl', { has: page.locator('span', { hasText: dCourse.id_name }) }).locator('select');
        ok((await optionTexts(dSelect)).slice(1).join(',') === 'A (4 点),B (3 点),C (2 点),F (0 点)', '会津大学：成績の選択肢は A・B・C・F だけ');
        ok((await dSelect.inputValue()) === 'F', '会津大学：保存データの D は成績入力で F として出る');
        ok(page.errors.length === 0, `会津大学：画面のエラーがない（${page.errors}）`);
        await page.context().close();
    },
};
