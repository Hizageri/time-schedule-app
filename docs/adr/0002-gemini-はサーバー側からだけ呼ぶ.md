# ADR-0002：Gemini はサーバー側（`api/`）からだけ呼ぶ

- 状態：採用
- 日付：2026-10-07（`CLAUDE.md` に記録）

## 選択肢

- ブラウザから Gemini を直接呼ぶ
- サーバー側の関数（Vercel Functions の `api/*.ts`）から呼ぶ

## 決めたこと

サーバー側の関数（Vercel Functions の `api/*.ts`）から呼ぶ。

## 選んだ理由

（作者の言葉で書く）
