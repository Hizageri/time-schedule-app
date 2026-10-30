// 試しの画面：Firebase と AI 窓口を偽物にして本物の画面を動かし、動きが変わっていないかを確かめる。
//   npm run check:ui                       すべての確認を流す
//   npm run check:ui -- --only 保存         名前に「保存」を含む確認だけ流す
//   npm run check:ui -- --update-snapshots 画面の HTML の基準を作り直す（移行の前に1回だけ使う）
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const updateSnapshots = args.includes('--update-snapshots');

const server = await createServer({ configFile: path.join(here, 'vite.config.ts'), server: { port: 5199 } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch();

const results = [];
let current = '';
const ok = (cond, message) => {
    results.push({ scenario: current, pass: Boolean(cond), message });
    console.log(`${cond ? 'PASS' : 'FAIL'} [${current}] ${message}`);
};

/** 偽物の準備ができた試しの画面を開く。外への通信は止める。docs を渡すと保存データに入れ、uid を渡すとログインする */
const open = async ({ docs, uid, viewport, routes } = {}) => {
    const context = await browser.newContext({ viewport: viewport ?? { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
    page.on('dialog', d => d.accept());
    await page.route('**/*', route => {
        const url = route.request().url();
        if (!url.startsWith(base)) return route.abort();
        for (const [suffix, handler] of Object.entries(routes ?? {})) {
            if (new URL(url).pathname === suffix) return handler(route);
        }
        return route.continue();
    });
    await page.goto(base + '/checks/ui/index.html');
    await page.waitForFunction(() => window.__h && window.__h.authCb);
    await page.waitForTimeout(200);
    if (docs) await page.evaluate(d => Object.assign(window.__h.docs, d), docs);
    if (uid) {
        await page.evaluate(u => window.__h.login(u), uid);
        await page.waitForTimeout(700);
    }
    page.errors = errors;
    return page;
};

/** 待っている保存をすぐ書かせ、保存データを返す（ページを閉じるときの保存の仕組みを使う） */
const flush = async page => {
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.waitForTimeout(150);
    return page.evaluate(() => window.__h.docs);
};

/** シラバスから科目を引く */
const syllabus = JSON.parse(fs.readFileSync(path.resolve(here, '../../src/data/syllabus.json'), 'utf8'));
const courses = Array.isArray(syllabus) ? syllabus : Object.values(syllabus);
const course = id => courses.find(c => c.id_name === id);

const t = { ok, open, flush, course, courses, base, updateSnapshots, snapshotsDir: path.join(here, 'snapshots') };

const files = fs.readdirSync(path.join(here, 'scenarios')).filter(f => f.endsWith('.mjs')).sort();
for (const file of files) {
    const scenario = (await import(pathToFileURL(path.join(here, 'scenarios', file)).href)).default;
    if (only && !scenario.name.includes(only)) continue;
    current = scenario.name;
    try {
        await scenario.run(t);
    } catch (e) {
        ok(false, '途中で止まった：' + String(e.message ?? e).split('\n')[0]);
    }
}

await browser.close();
await server.close();
const failed = results.filter(r => !r.pass);
console.log(`\n通った確認：${results.length - failed.length} / ${results.length}`);
if (failed.length) {
    console.log('通らなかった確認：');
    for (const r of failed) console.log(`  - [${r.scenario}] ${r.message}`);
}
process.exit(failed.length ? 1 : 0);
