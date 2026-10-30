// アプリを開くとログイン画面が出る（試しの画面そのものが動いているかの確認）
export default {
    name: '起動',
    async run({ ok, open }) {
        const page = await open();
        const body = await page.textContent('body');
        ok(body.includes('Google'), 'ログインしていなければログイン画面が出る');
        ok(page.errors.length === 0, `画面のエラーがない（${page.errors.join(' / ')}）`);
        await page.context().close();
    },
};
