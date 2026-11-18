// 今の大学を決める。利用者が使えるのは会津大学だけ。
// 開発サーバー（npm run dev。import.meta.env.DEV が true）で、かつ環境変数 VITE_UNIVERSITY=test を付けたときだけ試しの大学にする。
// 本番のビルドでは import.meta.env.DEV が false に置きかわるので、環境変数が何であっても会津大学になり、
// 試しの大学の設定はビルドの結果（dist/）に入らない（ADR-0025）
import type { UniversityConfig } from './universityConfig';
import { aizuUniversity } from './universities/aizu';
import { testUniversity } from './universities/test';

export const currentUniversity: UniversityConfig =
    import.meta.env.DEV && import.meta.env.VITE_UNIVERSITY === 'test' ? testUniversity : aizuUniversity;
