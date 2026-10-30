// 保存と読み込み（secure-and-stable 5.1・5.2）
const saved = {
    userProfile: { nickname: 'たろう', dreamJob: 'x', university: '会津大学', gradingScale: [{ label: 'A', point: 4 }] },
    currentScreen: 6, committedClasses: [{ courseId: 'C1', classId: 'K1' }], selectedCourses: [], grades: {}, pinnedClasses: { C1: 'K1' },
};
const calls = page => page.evaluate(() => window.__h.setDocCalls);
const resetCalls = page => page.evaluate(() => { window.__h.setDocCalls = []; });
const firstInput = page => page.locator('input[type="text"]:not([disabled])').first();

export default {
    name: '保存',
    async run({ ok, open }) {
        // ログイン直後（保存データあり）
        let page = await open({ docs: { 'users/userA': saved } });
        await resetCalls(page);
        await page.evaluate(() => window.__h.login('userA'));
        await page.waitForTimeout(1500);
        ok((await calls(page)).length === 0, 'ログイン直後（保存データあり）に保存が1回も走らない');
        ok(!(await page.textContent('body')).includes('保存データを読み込めなかった'), '読み込みに成功したら失敗の画面は出ない');
        await page.context().close();

        // 読み込みの失敗
        page = await open();
        await page.evaluate(() => { window.__h.getDocFail = true; window.__h.login('userB'); });
        await page.waitForSelector('text=保存データを読み込めなかった', { timeout: 3000 }).catch(() => {});
        ok((await page.textContent('body')).includes('保存データを読み込めなかった'), '読み込みに失敗すると失敗の画面が出る');
        ok(await page.locator('button:has-text("再読み込み")').count() === 1, '失敗の画面に再読み込みのボタンがある');
        await page.waitForTimeout(1500);
        ok((await calls(page)).length === 0, '読み込みに失敗したら保存しない');
        await page.context().close();

        // 保存データがない
        page = await open();
        await page.evaluate(() => window.__h.login('newUser'));
        await page.waitForTimeout(1000);
        const created = await calls(page);
        ok(created.length === 1 && created[0].path === 'users/newUser' && created[0].data.currentScreen === 1, '保存データがなければ初期値で1回だけ作る');
        await page.context().close();

        // 読み込み中の利用者の切り替え
        page = await open({ docs: { 'users/userA': saved, 'users/userB': { ...saved, userProfile: { ...saved.userProfile, nickname: 'はなこ' } } } });
        await page.evaluate(() => { const h = window.__h; h.getDocDelayMs = 300; h.login('userA'); setTimeout(() => h.login('userB'), 50); });
        await page.waitForTimeout(1500);
        ok((await calls(page)).length === 0, '読み込み中に利用者が切り替わっても保存しない');
        ok((await page.evaluate(() => window.__h.docs['users/userB'].userProfile.nickname)) === 'はなこ', '後の利用者の保存データは変わらない');
        await page.context().close();

        // 3秒まとめて丸ごと書く
        page = await open({ uid: 'typer' });
        await resetCalls(page);
        const input = firstInput(page);
        await input.pressSequentially('さぶろう', { delay: 150 });
        const typedAt = Date.now();
        await page.waitForTimeout(2000);
        ok((await calls(page)).length === 0, '入力中・止まって2秒では保存しない');
        await page.waitForTimeout(1500);
        const batched = await calls(page);
        ok(batched.length === 1, `続けて入力しても保存は1回（${batched.length}回）`);
        ok(batched[0] && batched[0].t - typedAt <= 3300 && batched[0].data.userProfile.nickname === 'さぶろう', '止まって3秒ほどで最後の内容を保存する');
        ok(batched[0] && batched[0].opts === null, 'merge なしで丸ごと書く');

        // すぐ書く保存
        await input.fill('しろう');
        await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForTimeout(100);
        ok((await calls(page)).at(-1)?.data.userProfile.nickname === 'しろう', 'ページが隠れたらすぐ保存する');
        await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
        await input.fill('ごろう');
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        await page.waitForTimeout(100);
        ok((await calls(page)).at(-1)?.data.userProfile.nickname === 'ごろう', 'ページを閉じるときすぐ保存する');

        // ログアウトの前に保存
        await input.fill('ろくろう');
        await page.evaluate(() => {
            const h = window.__h; const orig = h.authCb; h.order = [];
            const push = h.setDocCalls.push.bind(h.setDocCalls);
            h.setDocCalls.push = (...a) => { h.order.push('save'); return push(...a); };
            h.authCb = u => { if (!u) h.order.push('signedOut'); orig(u); };
        });
        await page.locator('button[title="ログアウト"]').click();
        await page.waitForTimeout(500);
        const order = await page.evaluate(() => window.__h.order);
        ok(order[0] === 'save' && order.includes('signedOut'), `ログアウトの前に保存する（${order.join('→')}）`);
        ok((await page.evaluate(() => window.__h.docs['users/typer'].userProfile.nickname)) === 'ろくろう', 'ログアウトの前の入力が保存データに残る');
        await page.context().close();

        // 利用者の切り替えの前に保存
        page = await open({ uid: 'userX' });
        await resetCalls(page);
        await firstInput(page).fill('えっくす');
        await page.evaluate(() => window.__h.login('userY'));
        await page.waitForTimeout(3800);
        const switched = await calls(page);
        ok(switched.some(c => c.path === 'users/userX' && c.data.userProfile.nickname === 'えっくす'), '切り替えの前に、前の利用者の分を前の利用者に書く');
        ok(!switched.some(c => c.path === 'users/userY' && c.data.userProfile.nickname === 'えっくす'), '前の利用者の状態を後の利用者に書かない');
        await page.context().close();

        // 保存の失敗
        for (const flag of ['setDocThrowSync', 'setDocReject']) {
            page = await open({ uid: 'errUser' });
            const logs = [];
            page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
            await page.evaluate(f => { window.__h[f] = true; }, flag);
            const field = firstInput(page);
            await field.fill('a');
            await page.waitForTimeout(3300);
            await field.fill('ab');
            await page.waitForTimeout(300);
            ok((await field.inputValue()) === 'ab' && !page.errors.some(e => !e.includes('Failed to save state')), `${flag}：保存に失敗しても画面は止まらない`);
            ok(logs.some(l => l.includes('Failed to save state')), `${flag}：開発者ツールに記録する`);
            await page.context().close();
        }
    },
};
