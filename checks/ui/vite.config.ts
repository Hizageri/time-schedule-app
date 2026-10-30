// 試しの画面の開発サーバー。Firebase を偽物に差し替える。本物の .env は読まない（envDir をここにする）
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const mock = (name: string) => path.join(here, 'mocks', name);

export default defineConfig({
    root: projectRoot,
    envDir: here,
    plugins: [
        {
            name: 'mock-firebase',
            enforce: 'pre',
            resolveId(source, importer) {
                if (source === 'firebase/auth') return mock('firebase-auth.ts');
                if (source === 'firebase/firestore') return mock('firebase-firestore.ts');
                // src の中から読まれる lib/firebase（移行の前後で場所は同じ）
                if (importer && importer.startsWith(path.join(projectRoot, 'src')) && /(^|\/)lib\/firebase$/.test(source)) {
                    return mock('lib-firebase.ts');
                }
                return null;
            },
        },
        react(),
    ],
    server: { strictPort: false, forwardConsole: false },
    logLevel: 'error',
});
