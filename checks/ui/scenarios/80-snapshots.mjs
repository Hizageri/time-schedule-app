// 画面の HTML を基準（checks/ui/snapshots/）と比べる。移行の前後で見た目が変わっていないことを確かめる
// 基準の作り直し：npm run check:ui -- --update-snapshots
import fs from 'fs';
import path from 'path';

const viewports = { pc: { width: 1280, height: 900 }, phone: { width: 390, height: 900 } };
const json = body => route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

export default {
    name: '画面の HTML',
    async run({ ok, open, course, updateSnapshots, snapshotsDir }) {
        const A = course('NS01 力学');
        const profile = { nickname: 'すなっぷ', dreamJob: 'エンジニア', university: '会津大学', enrollmentYearMonth: '2025-04', expectedGraduationYearMonth: '2029-03' };
        const committed = [{ courseId: A.id_name, targetBit: A.target_bit, classId: 'C1/C2', schedule: A.classes[0].schedule }];
        const userDoc = extra => ({ 'users/s': { userProfile: profile, selectedCourses: [A], committedClasses: committed, grades: { [A.id_name]: { grade: 'A', classDifficulty: 3, testDifficulty: 3 } }, pinnedClasses: { [A.id_name]: 'C3/C4' }, ...extra } });
        const routes = {
            '/api/consultation': json({ overallFeedback: 'こうひょう', courseFeedbacks: [{ courseId: A.id_name, courseName: A.id_name, comment: 'こめんと' }] }),
            '/api/timetable-patterns': json({ patterns: [1, 2, 3, 4, 5].map(i => ({ id: 'p' + i, name: 'パターン' + i, description: 'せつめい' + i, assignments: [{ courseId: A.id_name, classId: 'C5/C6' }] })) }),
        };
        const cases = [
            { name: 'login', setup: {} },
            { name: 'onboarding', setup: { uid: 'new' } },
            { name: 'load-error', setup: { uid: 's', fail: true } },
            { name: 'condition', setup: { uid: 's', docs: userDoc({ currentScreen: 2 }) } },
            { name: 'course-selection', setup: { uid: 's', docs: userDoc({ currentScreen: 3 }) } },
            { name: 'proposal', setup: { uid: 's', docs: userDoc({ currentScreen: 4 }) }, wait: 2500 },
            // 確定済みの授業があると生成画面ではなくダッシュボードが出る（今までの決まり）ので、確定済みの授業なしで開く
            { name: 'generator', setup: { uid: 's', docs: userDoc({ currentScreen: 5, committedClasses: [] }) }, wait: 4000 },
            { name: 'dashboard-timetable', setup: { uid: 's', docs: userDoc({ currentScreen: 6 }) } },
            { name: 'dashboard-grades', setup: { uid: 's', docs: userDoc({ currentScreen: 6 }) }, tab: /^成績$/ },
            { name: 'dashboard-profile', setup: { uid: 's', docs: userDoc({ currentScreen: 6 }) }, tab: /^プロフィール$/ },
            { name: 'grade-input', setup: { uid: 's', docs: userDoc({ currentScreen: 7 }) } },
        ];
        fs.mkdirSync(snapshotsDir, { recursive: true });
        for (const c of cases) {
            for (const [vpName, viewport] of Object.entries(viewports)) {
                const page = await open({ viewport, docs: c.setup.docs, routes });
                if (c.setup.fail) await page.evaluate(() => { window.__h.getDocFail = true; });
                if (c.setup.uid) await page.evaluate(u => window.__h.login(u), c.setup.uid);
                await page.waitForTimeout(c.wait ?? 1500);
                if (c.tab) {
                    await page.locator('button', { hasText: c.tab }).first().click();
                    await page.waitForTimeout(800);
                }
                const html = await page.locator('#root').innerHTML();
                const file = path.join(snapshotsDir, `${c.name}.${vpName}.html`);
                if (updateSnapshots) {
                    fs.writeFileSync(file, html + '\n');
                    ok(true, `${c.name}（${vpName}）の基準を作った`);
                } else if (!fs.existsSync(file)) {
                    ok(false, `${c.name}（${vpName}）の基準がない（--update-snapshots で作る）`);
                } else {
                    const expected = fs.readFileSync(file, 'utf8').replace(/\n$/, '');
                    let at = 0;
                    while (at < html.length && html[at] === expected[at]) at++;
                    ok(html === expected, `${c.name}（${vpName}）の HTML が基準と同じ` + (html === expected ? '' : `（${at} 文字目から違う：「${html.slice(at, at + 60)}」／基準「${expected.slice(at, at + 60)}」）`));
                }
                await page.context().close();
            }
        }
    },
};
