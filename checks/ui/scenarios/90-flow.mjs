// 全体の流れ（secure-and-stable 8.1、student-period 3.1）：保存データを書き出して開き直しながら最後まで進む
export default {
    name: '全体の流れ',
    async run({ ok, open, flush, course }) {
        const A = course('NS01 力学');
        const json = body => route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        const routes = {
            '/api/consultation': json({ overallFeedback: 'いい選び方だな', courseFeedbacks: [{ courseId: A.id_name, courseName: A.id_name, comment: '力学は大事だ' }] }),
            '/api/timetable-patterns': json({ patterns: [1, 2, 3, 4, 5].map(i => ({ id: 'p' + i, name: 'パターン' + i, description: 'd', assignments: [{ courseId: A.id_name, classId: 'C5/C6' }] })) }),
            '/api/grade-reaction': json({ title: '努力の後輩', message: 'よくやったな' }),
        };
        let docs = { 'users/u': {
            currentScreen: 3,
            userProfile: { nickname: 'ふろー', dreamJob: 'エンジニア', university: '会津大学' },
            selectedCourses: [A],
            committedClasses: [{ courseId: A.id_name, targetBit: A.target_bit, classId: 'C1/C2', schedule: A.classes[0].schedule }],
            pinnedClasses: { [A.id_name]: 'C3/C4' }, grades: {}, earnedCredits: [],
        } };
        let page;
        const start = async () => {
            page = await open({ docs, routes });
            await page.evaluate(() => { window.__h.login('u'); });
            await page.waitForTimeout(800);
        };
        const reload = async () => {
            docs = await flush(page);
            await page.context().close();
            await start();
        };
        const saved = () => docs['users/u'];
        const saves = () => page.evaluate(() => window.__h.setDocCalls.length);

        await start();
        ok((await saves()) === 0, 'ログイン直後に保存しない');
        await reload();
        ok((await saves()) === 0 && saved().committedClasses.length === 1 && saved().pinnedClasses[A.id_name] === 'C3/C4', '開き直しても保存データはそのまま');

        const card = page.locator('div.cursor-pointer').filter({ hasText: A.id_name }).first();
        await card.locator('button:has-text("詳細・口コミを見る")').click();
        const radios = page.locator(`input[type="radio"][name="classSelection-${A.id_name}"]`);
        ok(await radios.nth(2).isChecked(), '詳細モーダルでピン（C3/C4）が選ばれている');
        await radios.first().check();
        await reload();
        ok(!(A.id_name in saved().pinnedClasses) && saved().committedClasses.length === 1, 'ピンを外して開き直しても戻らず、確定済みの時間割はそのまま');

        await page.locator('button', { hasText: 'コマどり先輩に相談する' }).click();
        await page.waitForSelector('text=いい選び方だな', { timeout: 8000 }).catch(() => {});
        ok((await page.textContent('body')).includes('いい選び方だな'), 'AI 相談の講評が出る');
        await page.locator('button', { hasText: '時間割を自動生成' }).click();
        await page.waitForSelector('text=パターン1', { timeout: 10000 }).catch(() => {});
        const select = page.locator('select').filter({ has: page.locator('option[value="C5/C6"]') }).first();
        ok((await select.inputValue()) === 'C5/C6', 'ピンを外したのでパターンの割り当てになる');
        await page.locator('button', { hasText: 'この時間割で確定' }).click();
        await page.waitForSelector('text=時間割グリッド');
        await reload();
        ok(saved().currentScreen === 6 && saved().committedClasses[0].classId === 'C5/C6', '確定した時間割が保存され、開き直すとダッシュボードに出る');
        await page.locator('button', { hasText: /^Q2$/ }).click();
        ok((await page.locator('tbody tr').nth(4).locator('td').nth(1).textContent()).includes(A.id_name), 'ダッシュボードの月5限に確定した授業が出る');

        await page.locator('button', { hasText: 'プロフィール' }).first().click();
        await page.locator('button', { hasText: '編集する' }).click();
        await page.locator('select', { has: page.locator('option', { hasText: '限まで' }) }).selectOption('8');
        await page.locator('select[aria-label="入学年月の年"]').selectOption(String(new Date().getFullYear()));
        await page.locator('select[aria-label="入学年月の月"]').selectOption('4');
        await page.locator('button', { hasText: '保存する' }).click();
        await reload();
        ok(saved().timetableSettings.maxPeriods === 8 && (await page.locator('tbody tr').count()) === 8, '最大時限 8 が開き直しても表に反映される');
        ok(saved().userProfile.nickname === 'ふろー' && saved().userProfile.enrollmentYearMonth === `${new Date().getFullYear()}-04`, '入学年月が保存され、ほかのプロフィールはそのまま');

        await page.locator('button', { hasText: '成績を入力して次学期へ' }).click();
        await page.locator('select').first().selectOption('A');
        await page.locator('button', { hasText: 'コマどり先輩に評価してもらう' }).click();
        await page.waitForSelector('text=努力の後輩', { timeout: 8000 }).catch(() => {});
        ok((await page.textContent('body')).includes('努力の後輩'), '成績へのリアクションが出る');
        await page.locator('button', { hasText: '成績を一時保存してダッシュボードへ' }).click();
        await reload();
        ok(saved().grades[A.id_name]?.grade === 'A' && saved().currentScreen === 6, '成績が保存され、開き直すとダッシュボード');

        await page.locator('button', { hasText: '成績' }).first().click();
        await page.locator('button', { hasText: 'この学期を終了して新学期へ進む' }).click();
        await page.waitForTimeout(300);
        await reload();
        const s = saved();
        ok(s.currentScreen === 2 && s.committedClasses.length === 0 && Object.keys(s.grades).length === 0 && Object.keys(s.pinnedClasses).length === 0, '新学期：時間割・成績・ピンが空で、条件の画面から');
        ok(s.earnedCredits.some(e => e.courseId === A.id_name) && s.timetableConditions.term === 'second' && s.timetableSettings.maxPeriods === 8, '新学期：合格した科目は修得済みに入り、後期に進み、最大時限は保たれる');
        ok((await saves()) === 0, '開き直した直後に保存しない');
        ok(page.errors.length === 0, `画面のエラーがない（${page.errors.join(' / ')}）`);
        await page.context().close();
    },
};
