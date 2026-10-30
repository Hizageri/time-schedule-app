// 最大時限と入力欄の上限（secure-and-stable 6.1）、表示の範囲の外の知らせ（6.4）
const NOTICE = '10限の授業が表示の範囲（5限まで）の外にあります。プロフィールで最大時限を変えられます';
const periodSelect = page => page.locator('select', { has: page.locator('option', { hasText: '限まで' }) });

export default {
    name: '最大時限',
    async run({ ok, open, flush, course }) {
        const profile = { nickname: 'だい', dreamJob: '', university: '会津大学' };
        // オンボーディング
        let page = await open({ uid: 'n' });
        const options = await periodSelect(page).locator('option').evaluateAll(o => o.map(x => x.value));
        ok(options.join(',') === '5,6,7,8,9,10,11', 'オンボーディングの最大時限は 5〜11');
        const inputs = page.locator('input[type="text"]:not([disabled])');
        await inputs.nth(0).fill('あ'.repeat(150));
        await inputs.nth(1).fill('い'.repeat(150));
        ok((await inputs.nth(0).inputValue()).length === 100 && (await inputs.nth(1).inputValue()).length === 100, 'オンボーディングのニックネーム・職業は100文字まで');
        await page.context().close();

        // プロフィールで 11 にする → 表が 11 行、開き直しても保たれる
        page = await open({ docs: { 'users/d': { currentScreen: 6, userProfile: profile } }, uid: 'd' });
        const rowsBefore = await page.locator('tbody tr').count();
        await page.locator('button', { hasText: 'プロフィール' }).first().click();
        await page.locator('button', { hasText: '編集する' }).click();
        const profileInputs = page.locator('input[type="text"]');
        await profileInputs.nth(0).fill('う'.repeat(150));
        ok((await profileInputs.nth(0).inputValue()).length === 100, 'プロフィールのニックネームは100文字まで');
        await profileInputs.nth(0).fill('だい');
        await periodSelect(page).selectOption('11');
        await page.locator('button', { hasText: '保存する' }).click();
        await page.locator('button', { hasText: '時間割' }).first().click();
        ok(rowsBefore === 5 && (await page.locator('tbody tr').count()) === 11, 'プロフィールで 11 にするとダッシュボードの表が 11 行になる');
        const saved = (await flush(page))['users/d'];
        await page.context().close();
        page = await open({ docs: { 'users/d': saved }, uid: 'd' });
        ok((await page.locator('tbody tr').count()) === 11, '開き直しても 11 行のまま');
        await page.context().close();

        // 表示の範囲の外の知らせ（ダッシュボード）
        const B = course('NS01 力学（再履修）'); const cls = B.classes[0];
        page = await open({ uid: 'x', docs: { 'users/x': {
            currentScreen: 6, userProfile: profile, timetableSettings: { maxPeriods: 5, workingDays: 5 }, timetableConditions: { term: 'second', targetGrade: 2, baseClass: '' },
            committedClasses: [{ courseId: B.id_name, targetBit: cls.target_bit, classId: cls.class_id, schedule: cls.schedule }, { courseId: 'かさなり', targetBit: cls.target_bit, classId: 'K', schedule: ['月-9'] }],
        } } });
        ok(await page.locator(`text=${NOTICE}`).count() === 1, 'ダッシュボード：最大時限 5 で 10 限の授業があると知らせが出る');
        await page.locator('button', { hasText: 'プロフィール' }).first().click();
        await page.locator('button', { hasText: '編集する' }).click();
        await periodSelect(page).selectOption('11');
        await page.locator('button', { hasText: '保存する' }).click();
        await page.locator('button', { hasText: '時間割' }).first().click();
        await page.locator('button', { hasText: /^Q4$/ }).click();
        ok(await page.locator('text=表示の範囲').count() === 0, 'ダッシュボード：最大時限 11 にすると知らせが消える');
        const monday9 = await page.locator('tbody tr').nth(8).locator('td').nth(1).textContent();
        ok(monday9.includes(B.id_name) && monday9.includes('かさなり'), 'ダッシュボード：9 限の授業と重なりが表で見える');
        await page.context().close();

        // 生成画面の知らせとスマートフォン向けの一覧
        for (const [maxPeriods, expectNotice] of [[5, true], [11, false]]) {
            page = await open({ viewport: { width: 390, height: 900 }, uid: 'y', docs: { 'users/y': {
                currentScreen: 5, selectedCourses: [B], userProfile: profile, timetableSettings: { maxPeriods, workingDays: 5 }, timetableConditions: { term: 'second', targetGrade: 2, baseClass: '' },
            } } });
            await page.waitForTimeout(3800);
            const shown = await page.locator(`text=${NOTICE}`).count();
            ok(expectNotice ? shown === 1 : (await page.locator('text=表示の範囲').count()) === 0, `生成画面：最大時限 ${maxPeriods} で知らせが${expectNotice ? '出る' : '出ない'}`);
            await page.locator('button', { hasText: /Q4表示/ }).first().click();
            const mobile = await page.locator('div.md\\:hidden').last().textContent();
            ok(expectNotice ? !mobile.includes('9限') : mobile.includes('9限') && mobile.includes('10限'), `スマートフォン向けの一覧：最大時限 ${maxPeriods} で 9・10 限が${expectNotice ? '出ない' : '出る'}`);
            await page.context().close();
        }
    },
};
