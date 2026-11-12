# ADR-0020：画面を React で作り、Vite でビルドする（Next.js は使わない）

- 状態：採用
- 日付：2026-11-12

## 選択肢

- React ＋ Vite
- Next.js
- Vue ＋ Vite（Nuxt）
- Svelte ＋ Vite（SvelteKit）
- React ＋ webpack

## 決めたこと

React ＋ Vite。Next.js は使わない。

## 選んだ理由

最初は特に理由がなく、AI におすすめされたから。

Next.js を使わずに React＋Vite にした理由はシラバスを DB から読む回数が問題ないという点。実際に一日200人が３０日使うとしても無料枠での制限内でおさまるから。また Next.js と React＋Vite を比較した時にアプリにほしい機能として「画面ごとに url を持たせることにより戻る機能を使えること」「シラバスを DB 化」この二つの機能を Next.js を使わなくても実装可能だとわかったから。
