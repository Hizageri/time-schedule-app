# Requirements Document

## Project Description (Input)
**誰が困っているか**：このアプリの開発者（と、後続の spec `core-bug-fixes`・`empty-slot-search`・`first-run-ux-refresh` の実装）。

**現状**：`src/` の構成が `structure.md` の「目標の構成（2026-10-13 決定）」と合っていない。`logic/`・`ai/`・`ui/`・`components/App.tsx`・`data.ts` という旧構成のままで、画面ファイル（`DashboardScreen.tsx` 559行、`GeneratorScreen.tsx` 497行、`CourseSelectionScreen.tsx` など）に計算・通信・ビット判定が直接書かれている。学期・クォーターのビット判定（4〜5か所）、コマ表のセル探しと表のマークアップ（Generator と Dashboard）、合格の判定（4か所）が重複しており、後続の spec で同じ修正を何か所にも入れる必要がある。テストはなく、lint エラーは約50件（未確認）。

**何を変えるか**：案B「移行をやり切る」（`roadmap.md`）で、`src/` を目標の構成に移す。型・計算・通信・状態（`types/`・`utils/`・`services/`・`context/`・`lib/`・`data/`）→ 重複計算の `utils/` への集約 → 各画面の計算・通信の `hooks/` への切り出し → UI 部品（`components/`・`assets/`・`App.tsx`）の順に進める。`AppContext` の Firestore 同期は `hooks/` に分け、`services/aiApi.ts` と後続 spec が使う `utils/`・`hooks/` を切り出す。移行後に `structure.md` の「現状の構成」と「依存の向き（現状）」を更新する。`npm run build` がエラーなしで通ること。**画面の見た目と動きは移行前と完全に同じ（既知の不具合も含めて変えない）**。不具合修正・見た目の変更・未使用コードの削除・データの形の変更は範囲外。lint エラーゼロと必須以外の画面整理は「余裕があれば」。

詳細は `brief.md` を参照。

## Requirements
<!-- Will be generated in /kiro-spec-requirements phase -->
