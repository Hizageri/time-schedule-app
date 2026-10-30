// AI の呼び出し（secure-and-stable 4.2、student-period 2.3）
const SENPAI_ERROR = 'なんか調子が悪いみてえだ。時間をおいて出直してこい';
const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export default {
    name: 'AI',
    async run({ ok, open, course }) {
        const A = course('NS01 力学');
        const profile = { nickname: 'えーあい', dreamJob: 'けんきゅう', university: '会津大学', enrollmentYearMonth: '2025-04', expectedGraduationYearMonth: '2029-03' };
        const consultDoc = { 'users/x': { currentScreen: 4, userProfile: profile, selectedCourses: [A] } };
        const gradeDoc = { 'users/x': { currentScreen: 7, userProfile: profile, selectedCourses: [A], committedClasses: [{ courseId: A.id_name, targetBit: 65, classId: 'C1/C2', schedule: ['月-1'] }] } };
        const askGrade = async page => {
            await page.locator('select').first().selectOption('A');
            await page.locator('button', { hasText: 'コマどり先輩に評価してもらう' }).click();
            await page.waitForTimeout(800);
        };

        // 相談：トークン・送る項目・表示
        let sent = null; let auth = null;
        let page = await open({ docs: consultDoc, uid: 'x', routes: { '/api/consultation': r => {
            sent = JSON.parse(r.request().postData()); auth = r.request().headers().authorization;
            return json(r, 200, { overallFeedback: 'こうひょう', courseFeedbacks: [{ courseId: A.id_name, courseName: A.id_name, comment: 'こめんと' }] });
        } } });
        await page.waitForSelector('text=こうひょう', { timeout: 8000 }).catch(() => {});
        ok(auth === 'Bearer tok', '相談：ログインのトークンを付けて呼ぶ');
        ok(sent && JSON.stringify(Object.keys(sent.userProfile).sort()) === JSON.stringify(['dreamJob', 'nickname', 'university']), '相談：送るプロフィールはニックネーム・職業・大学だけ');
        ok(sent && !JSON.stringify(sent).includes('2025-04'), '相談：依頼に入学・卒業予定年月がない');
        ok((await page.textContent('body')).includes('こうひょう'), '相談：講評が表示される');
        await page.context().close();

        // 相談：401 → ログイン画面、400・500 → 先輩の文面
        page = await open({ docs: consultDoc, uid: 'x', routes: { '/api/consultation': r => json(r, 401, { error: 'unauthenticated' }) } });
        await page.waitForTimeout(1200);
        ok((await page.textContent('body')).includes('Google') && await page.locator('button[title="ログアウト"]').count() === 0, '相談：401 ならログアウトしてログイン画面に戻る');
        await page.context().close();
        for (const status of [400, 500]) {
            page = await open({ docs: consultDoc, uid: 'x', routes: { '/api/consultation': r => json(r, status, { error: 'x' }) } });
            await page.waitForTimeout(1200);
            const body = await page.textContent('body');
            ok(body.includes(SENPAI_ERROR) && await page.locator('button[title="ログアウト"]').count() === 1, `相談：${status} ならログアウトせず先輩の口調の文面を出す`);
            await page.context().close();
        }

        // 成績のリアクション：送る項目・表示
        sent = null;
        page = await open({ docs: gradeDoc, uid: 'x', routes: { '/api/grade-reaction': r => { sent = JSON.parse(r.request().postData()); return json(r, 200, { title: 'しょうごう', message: 'りあくしょん' }); } } });
        await askGrade(page);
        ok(sent && JSON.stringify(Object.keys(sent.userProfile).sort()) === JSON.stringify(['dreamJob', 'gradingScale', 'nickname', 'university']), '成績：送るプロフィールは名前・職業・大学・成績の段階だけ');
        ok(sent && !JSON.stringify(sent).includes('2025-04'), '成績：依頼に入学・卒業予定年月がない');
        ok((await page.textContent('body')).includes('しょうごう'), '成績：リアクションが表示される');
        await page.context().close();

        // 成績のリアクション：400 → 今までどおりの文面
        page = await open({ docs: gradeDoc, uid: 'x', routes: { '/api/grade-reaction': r => json(r, 400, { error: 'invalid_input' }) } });
        await askGrade(page);
        ok((await page.textContent('body')).includes('なんだかエラーが出たな'), '成績：400 なら今までどおりの文面を出す');
        await page.context().close();

        // 時間割の生成：500 → 代わりの時間割
        page = await open({ docs: { 'users/x': { currentScreen: 5, userProfile: profile, selectedCourses: [A] } }, uid: 'x', routes: { '/api/timetable-patterns': r => json(r, 500, { error: 'x' }) } });
        await page.waitForTimeout(3500);
        ok((await page.textContent('body')).includes('全休作成型'), '生成：AI が失敗したら代わりの時間割の5パターンを出す');
        await page.context().close();
    },
};
