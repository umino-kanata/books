# My Collection Ver.1 Prototype

スマホ向けの静的Webアプリです。GitHub Pagesで公開できます。

## 現在できること
- メディア切替（本・雑誌 / CD / DVD / Blu-ray / VHS / デジタル）
- 手入力登録・編集
- 初期値「所有している」
- タイトル・著者検索
- カテゴリー検索
- 未読 / お気に入り絞り込み
- 自由カテゴリー追加
- 所有 / 未所有 / 購入予定 / 予約済み / 売却 / 贈呈など
- 保管場所
- 貸出中・貸した相手
- 感想・メモ
- JSONバックアップ / 復元

## 次の実装候補
- ISBN/JANバーコード読み取り
- 連続登録
- 表紙/奥付の画像読み取り
- シリーズ・BOX・版の詳細構造
- 履歴のイベント保存
- 著者/人物データの独立管理

## GitHub Pages
1. 新しいリポジトリを作成
2. `index.html`, `style.css`, `app.js` をアップロード
3. Settings → Pages → Deploy from a branch
4. Branch を `main` / root にして保存

※データはブラウザの localStorage に保存されます。バックアップ機能を使って定期的にJSONファイルを保存してください。
