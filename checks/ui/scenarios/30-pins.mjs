// ピン留めを守る（secure-and-stable 6.2）と、ピンの保存（5.2）
export default {
    name: 'ピン',
    async run({ ok, open, course, courses, flush }) {
        const A = course('NS01 力学'); // C1/C2・C3/C4・C5/C6
        const other = courses.find(c => c.classes.length >= 2 && c.id_name !== A.id_name);
        const patterns = { patterns: [1, 2, 3, 4, 5].map(i => ({ id: 'p' + i, name: 'P' + i, description: 'd', assignments: [{ courseId: A.id_name, classId: 'C5/C6' }, { courseId: other.id_name, classId: other.classes[1].class_id }] })) };
        const generate = async (pins, aiOk) => {
            const route = r => (aiOk
                ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(patterns) })
                : r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' }));
            const page = await open({
                docs: { 'users/g': { currentScreen: 5, selectedCourses: [A, other], pinnedClasses: pins, timetableSettings: { maxPeriods: 11, workingDays: 5 }, userProfile: { nickname: 'g', dreamJob: '', university: '会津大学' } } },
                uid: 'g', routes: { '/api/timetable-patterns': route },
            });
            await page.waitForTimeout(3800);
            const select = page.locator('select').filter({ has: page.locator('option[value="C1/C2"]') }).first();
            const tabs = page.locator('button').filter({ hasText: aiOk ? /^P[1-5]/ : /AIおすすめ|全休作成型|1限回避型|遅い時間回避|空きコマ削減/ });
            const values = [];
            for (let i = 0; i < await tabs.count(); i++) {
                await tabs.nth(i).click();
                await page.waitForTimeout(100);
                values.push(await select.inputValue());
            }
            return { page, values, select };
        };

        let r = await generate({ [A.id_name]: 'C3/C4' }, true);
        ok(r.values.length === 5 && r.values.every(v => v === 'C3/C4'), `AI の5パターンすべてでピンのクラスになる（${r.values}）`);
        await r.select.selectOption('C1/C2');
        await r.page.waitForTimeout(200);
        ok((await r.select.inputValue()) === 'C1/C2', '手で変えたクラスは、そのパターンを表示している間そのまま');
        await r.page.context().close();

        r = await generate({ [A.id_name]: 'C3/C4' }, false);
        ok(r.values.length === 5 && r.values.every(v => v === 'C3/C4'), `AI が失敗したときの代わりの5パターンでもピンのクラスになる（${r.values}）`);
        await r.page.context().close();

        r = await generate({ [A.id_name]: 'ZZ' }, true);
        ok(r.values.every(v => v === 'C5/C6'), `開講クラスにないピンは使わず、パターンの割り当てになる（${r.values}）`);
        await r.page.context().close();

        r = await generate({}, false);
        ok(r.values.every(v => v === 'C1/C2'), `ピンも割り当てもなければ最初のクラスになる（${r.values}）`);
        await r.page.context().close();

        // 詳細モーダルでピンを付けて外す → 保存データからも消える
        const page = await open({ docs: { 'users/pin': { currentScreen: 3, userProfile: { nickname: 'ぴん', dreamJob: '', university: '会津大学' } } }, uid: 'pin' });
        const card = page.locator('div.cursor-pointer').filter({ hasText: /[2-9]種類のクラスが開講/ }).first();
        await card.locator('button:has-text("詳細・口コミを見る")').click();
        await page.waitForSelector('text=受講クラス希望');
        const radios = page.locator('input[type="radio"][name^="classSelection-"]');
        const courseId = (await radios.first().getAttribute('name')).replace('classSelection-', '');
        await radios.nth(1).check();
        let docs = await flush(page);
        ok(Boolean(docs['users/pin'].pinnedClasses?.[courseId]), 'ピンが保存される');
        await radios.first().check();
        docs = await flush(page);
        ok(!(courseId in (docs['users/pin'].pinnedClasses ?? {})), 'ピンを外すと保存データからも消える');
        await page.context().close();
    },
};
