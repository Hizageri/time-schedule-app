// 入学・卒業予定年月（student-period）
const PARTIAL = '年と月の両方を選ぶか、両方を空にしてください';
const ORDER = '卒業予定は入学より後の年月にしてください';
const sel = (page, label, part) => page.locator(`select[aria-label="${label}の${part}"]`);
const row = (page, label) => page.locator('div.grid', { has: page.locator('div', { hasText: new RegExp('^' + label + '$') }) }).first();
const year = new Date().getFullYear();

export default {
    name: '入学と卒業予定',
    async run({ ok, open, flush }) {
        // 古い保存データ
        let page = await open({ docs: { 'users/old': { currentScreen: 6, userProfile: { nickname: 'ふるい', dreamJob: '', university: '会津大学' } } }, uid: 'old' });
        ok((await page.textContent('body')).includes('ダッシュボード'), '年月のない古い保存データでも、オンボーディングに戻されない');
        await page.locator('button', { hasText: 'プロフィール' }).first().click();
        ok((await row(page, '入学年月').textContent()).includes('未設定') && (await row(page, '卒業予定年月').textContent()).includes('未設定'), '年月がなければ「未設定」と出る');
        await page.context().close();

        // オンボーディング
        page = await open({ uid: 'a' });
        await page.locator('input[type="text"]:not([disabled])').first().fill('にゅう');
        const yearOptions = await sel(page, '入学年月', '年').locator('option').evaluateAll(o => o.map(x => x.value).filter(Boolean));
        ok((await sel(page, '入学年月', '年').inputValue()) === '' && (await sel(page, '卒業予定年月', '月').inputValue()) === '', 'オンボーディング：年月の欄は最初は空');
        ok(yearOptions[0] === String(year - 4) && yearOptions.at(-1) === String(year + 4) && yearOptions.length === 9, 'オンボーディング：選べる年は今年の前後4年');
        await sel(page, '入学年月', '年').selectOption(String(year - 1));
        ok((await sel(page, '卒業予定年月', '年').inputValue()) === '', 'オンボーディング：入学を選んでも卒業予定は変わらない');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(300);
        ok((await page.textContent('body')).includes(PARTIAL) && !(await page.textContent('body')).includes('新学期の条件'), 'オンボーディング：年だけで進もうとすると知らせが出て進まない');
        await sel(page, '入学年月', '月').selectOption('4');
        ok(!(await page.textContent('body')).includes(PARTIAL), 'オンボーディング：月を選ぶと知らせが消える');
        await sel(page, '卒業予定年月', '年').selectOption(String(year - 1));
        await sel(page, '卒業予定年月', '月').selectOption('4');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(300);
        ok((await page.textContent('body')).includes(ORDER), 'オンボーディング：卒業予定が入学と同じ年月だと知らせが出る');
        await sel(page, '卒業予定年月', '年').selectOption(String(year + 3));
        await sel(page, '卒業予定年月', '月').selectOption('3');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(300);
        const up = (await flush(page))['users/a'].userProfile;
        ok((await page.textContent('body')).includes('新学期の条件') && up.enrollmentYearMonth === `${year - 1}-04` && up.expectedGraduationYearMonth === `${year + 3}-03`, 'オンボーディング：正しく入れると進み、年月が保存される');
        await page.context().close();

        // オンボーディング：空のまま進める
        page = await open({ uid: 'b' });
        await page.locator('input[type="text"]:not([disabled])').first().fill('から');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(300);
        const empty = (await flush(page))['users/b'].userProfile;
        ok((await page.textContent('body')).includes('新学期の条件') && empty.enrollmentYearMonth === '' && empty.expectedGraduationYearMonth === '', 'オンボーディング：年月を空のままでも進める');
        await page.context().close();

        // プロフィール
        const base = { currentScreen: 6, userProfile: { nickname: 'だい', dreamJob: '', university: '会津大学', enrollmentYearMonth: '2025-04', expectedGraduationYearMonth: '2029-03' }, timetableSettings: { maxPeriods: 8, workingDays: 5 }, pinnedClasses: { 'NS01 力学': 'C1/C2' } };
        page = await open({ docs: { 'users/d': base }, uid: 'd' });
        await page.locator('button', { hasText: 'プロフィール' }).first().click();
        ok((await row(page, '入学年月').textContent()).includes('2025年4月') && (await row(page, '卒業予定年月').textContent()).includes('2029年3月'), 'プロフィール：年月を表示する');
        await page.locator('button', { hasText: '編集する' }).click();
        ok((await sel(page, '入学年月', '年').inputValue()) === '2025' && (await sel(page, '卒業予定年月', '月').inputValue()) === '3', 'プロフィール：編集で今の値が選ばれている');
        await page.locator('input[type="text"]').first().fill('かえた');
        await sel(page, '入学年月', '月').selectOption('');
        await page.locator('button', { hasText: '保存する' }).click();
        await page.waitForTimeout(200);
        let docs = await flush(page);
        ok((await page.textContent('body')).includes(PARTIAL) && docs['users/d'].userProfile.nickname === 'だい', 'プロフィール：片方だけで保存すると知らせが出て、ニックネームの変更も保存されない');
        await sel(page, '入学年月', '月').selectOption('4');
        await sel(page, '卒業予定年月', '年').selectOption('');
        await sel(page, '卒業予定年月', '月').selectOption('');
        await page.locator('button', { hasText: '保存する' }).click();
        await page.waitForTimeout(200);
        docs = await flush(page);
        ok((await row(page, '卒業予定年月').textContent()).includes('未設定') && docs['users/d'].userProfile.expectedGraduationYearMonth === '' && docs['users/d'].userProfile.nickname === 'かえた', 'プロフィール：空に戻して保存すると未設定になり、ほかの変更も一緒に保存される');
        ok(docs['users/d'].pinnedClasses['NS01 力学'] === 'C1/C2' && docs['users/d'].timetableSettings.maxPeriods === 8, 'プロフィール：ピンと最大時限は変わらない');
        await page.context().close();

        // 範囲の外の保存済みの年
        page = await open({ docs: { 'users/e': { ...base, userProfile: { ...base.userProfile, enrollmentYearMonth: '2010-04', expectedGraduationYearMonth: '' } } }, uid: 'e' });
        await page.locator('button', { hasText: 'プロフィール' }).first().click();
        await page.locator('button', { hasText: '編集する' }).click();
        ok((await sel(page, '入学年月', '年').inputValue()) === '2010', '範囲の外の保存済みの年も選ばれた状態で出る');
        await page.context().close();
    },
};
