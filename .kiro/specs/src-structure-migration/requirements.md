# Requirements Document

## Project Description (Input)
**だれが困っているか**：コマどりの作者（と、一緒に作る Claude）。これから作る機能（大学ごとの設定・空きコマ検索・デザインの統一・画面の作り直し）で、同じ計算を何か所も直すことになり、漏れや作り直しが起きやすい。

**今の状態**：`src/` の構成が `structure.md` の「目標の構成（2026-10-13 決定）」と合っていない。画面ファイルに計算と状態の操作が直接書かれていて大きく（`DashboardScreen.tsx` 663行・`GeneratorScreen.tsx` 479行・`AppContext.tsx` 347行）、学期・クォーターのビット判定は9か所、コマ表のセル探しは2か所に重複している。第1段階の後に増えた `logic/universityConfig.ts`・`logic/inputLimits.ts` の移行先は決まっていない。テストの仕組みはなく、第1段階は一時フォルダの「試しの画面」で確かめた。

**何を変えるか**：`src/` を目標の構成（`types/`・`utils/`・`services/`・`context/`・`hooks/`・`components/`・`assets/`・`data/`）に移し、重複している計算を `utils/` の1か所にまとめ、Firestore 同期と画面の裏側の処理を `hooks/` に出す。**画面の見た目と動きは移行前と完全に同じにする**（第1段階・`student-period` で直した動きも変えない）。移行後に `structure.md` などのファイルの場所の記述を更新する。

詳しい背景・範囲・制約・決めること（Open Questions）は同じフォルダの `brief.md` を参照。

## Requirements
<!-- Will be generated in /kiro-spec-requirements phase -->
