// 科目の上限（secure-and-stable 6.3）、確定済みの授業の削除と新学期（5.3）
const LIMIT_MESSAGE = '一度に選べるのは 40 科目までです';

export default {
    name: '科目',
    async run({ ok, open, flush, course, courses }) {
        // 41科目目：まず画面に出る科目を調べる
        let page = await open({ docs: { 'users/s': { currentScreen: 3, userProfile: { nickname: 's', dreamJob: '', university: '会津大学' } } }, uid: 's' });
        const visible = await page.locator('div.cursor-pointer h3').allTextContents();
        await page.context().close();
        const selected = [...visible.slice(0, 2).map(v => course(v)), ...courses.filter(c => !visible.includes(c.id_name)).slice(0, 38)];
        page = await open({ docs: { 'users/s': { currentScreen: 3, selectedCourses: selected, userProfile: { nickname: 's', dreamJob: '', university: '会津大学' } } }, uid: 's' });
        const count = async () => (await flush(page))['users/s'].selectedCourses.length;
        const unchecked = page.locator('div.cursor-pointer input[type="checkbox"]:not(:checked)').first();
        await unchecked.click();
        await page.waitForTimeout(200);
        ok(page.dialogs.at(-1) === LIMIT_MESSAGE, 'カードのチェック：40科目のとき41科目目を選ぶと知らせが出る');
        ok(!(await unchecked.isChecked()) && (await count()) === 40, 'カードのチェック：41科目目は選ばれず40のまま');
        page.dialogs.length = 0;
        const card = page.locator('div.cursor-pointer').filter({ has: page.locator('input[type="checkbox"]:not(:checked)') }).first();
        await card.locator('button:has-text("詳細・口コミを見る")').click();
        await page.waitForSelector('text=受講クラス希望');
        await page.locator('button', { hasText: 'この教科を選択する' }).click();
        await page.waitForTimeout(200);
        ok(page.dialogs.at(-1) === LIMIT_MESSAGE && (await count()) === 40, '詳細モーダル：知らせが出て40のまま');
        await page.locator('button[title="閉じる"]').click();
        await page.locator('div.cursor-pointer input[type="checkbox"]:checked').first().click();
        await page.waitForTimeout(200);
        ok((await count()) === 39, '40科目のときでも外すことはできる');
        await page.context().close();

        // 確定済みの授業の削除（名前の一部が重なる2科目）と新学期
        const A = course('NS01 力学'); const B = course('NS01 力学（再履修）');
        const entry = c => ({ courseId: c.id_name, targetBit: c.target_bit, classId: c.classes[0].class_id, schedule: c.classes[0].schedule });
        page = await open({ uid: 'u', docs: { 'users/u': {
            currentScreen: 6,
            userProfile: { nickname: 't', dreamJob: '', university: '会津大学', gradingScale: [{ label: 'A', point: 4 }, { label: 'D', point: 0 }, { label: 'F', point: 0 }] },
            timetableSettings: { maxPeriods: 11, workingDays: 5 },
            selectedCourses: [A, B], committedClasses: [entry(A), entry(B)],
            grades: { PASS1: { grade: 'A', classDifficulty: 3, testDifficulty: 3 }, FAILD: { grade: 'D', classDifficulty: 3, testDifficulty: 3 }, FAILF: { grade: 'F', classDifficulty: 3, testDifficulty: 3 }, UNKNOWN: { grade: '不可', classDifficulty: 3, testDifficulty: 3 } },
            earnedCredits: [],
        } } });
        await page.locator('button', { hasText: /^Q2$/ }).click();
        await page.locator('div', { has: page.locator('div.font-bold', { hasText: /^NS01 力学$/ }) }).locator('button[title="この授業を削除"]').first().click();
        let docs = await flush(page);
        ok(docs['users/u'].committedClasses.length === 1 && docs['users/u'].committedClasses[0].courseId === B.id_name, '確定済みの授業の削除：その授業だけ消え、名前の一部が重なる授業は残る');
        ok(docs['users/u'].selectedCourses.length === 1 && docs['users/u'].selectedCourses[0].id_name === B.id_name, '確定済みの授業の削除：選んだ科目も ID が一致するものだけ消える');
        await page.locator('button', { hasText: '成績' }).first().click();
        await page.locator('button:has-text("この学期を終了して新学期へ進む")').click();
        await page.waitForTimeout(300);
        docs = await flush(page);
        const earned = docs['users/u'].earnedCredits.map(e => e.courseId);
        ok(earned.includes('PASS1') && !earned.includes('FAILD') && !earned.includes('FAILF') && !earned.includes('UNKNOWN'), `新学期：合格（A）だけ修得済みに入り、D/F・段階にない名前は入らない（${earned}）`);
        await page.context().close();
    },
};
