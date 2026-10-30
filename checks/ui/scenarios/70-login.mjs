// ログインのポップアップを閉じたとき（2026-10-30 の修正）
const FAIL_MESSAGE = 'ログインに失敗しました';

export default {
    name: 'ログイン',
    async run({ ok, open }) {
        for (const [code, expectMessage] of [['auth/popup-closed-by-user', false], ['auth/cancelled-popup-request', false], ['auth/network-request-failed', true]]) {
            const page = await open();
            const errors = [];
            page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
            await page.evaluate(c => { window.__h.popupErrorCode = c; }, code);
            const button = page.locator('button', { hasText: /Google/ }).first();
            await button.click();
            await page.waitForTimeout(400);
            const body = await page.textContent('body');
            if (expectMessage) {
                ok(body.includes(FAIL_MESSAGE) && errors.some(e => e.includes(code)), `${code}：失敗の文言を出し、開発者ツールに記録する`);
            } else {
                ok(!body.includes(FAIL_MESSAGE) && errors.length === 0, `${code}：失敗の文言も赤いエラーも出さない`);
            }
            await page.evaluate(() => { window.__h.popupErrorCode = undefined; });
            await button.click();
            await page.waitForTimeout(800);
            ok(await page.locator('button[title="ログアウト"]').count() === 1, `${code}：もう一度押すとログインできる`);
            await page.context().close();
        }
    },
};
