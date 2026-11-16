# ADR-0022：Gemini の呼び方に Interactions API を使う

- 状態：採用
- 日付：2026-11-13

## 選択肢

- Interactions API
- generateContent

## 決めたこと

Interactions API。依頼の内容を Google 側に保存しないよう、すべての依頼に `store: false` を付ける。

## 選んだ理由

これから新しい機能が来るほうにしたいから interactions api にする。
