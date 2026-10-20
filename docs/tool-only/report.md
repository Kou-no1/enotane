# えのたね：手を廃止し、道具だけを表示する変更

2026-10-09。対象：`C:/Users/shudi/Documents/New project/enotane`。

手・袖・手袋の描画、ポーズ、手の一覧、手の素材と比較用描画コードを削除しました。道具だけを描画点に合わせて表示します。台本の `hand.enter` / `hand.exit` / `hand.move` と `tool` の指定は維持しています。既存の画材処理・台本・プレイヤーUIは変更していません。確認用の一覧だけを「道具の確認ページ」に置き換えました。

## 表示の仕様

- 鉛筆・筆は指定された描画コードの形を採用。先端を原点にし、論理座標へ `TOOL_SCALE = 0.8` を適用します。
- 通常の角度は −55°で固定。曲線を描く際も進行方向に追従して回転しません。
- ねかせたクレヨンは、最初の連続した描画区間に対して直角の角度を一度決め、そのアクション中は固定します。接触する腹の中央を描画点に合わせます。
- 先端位置には、画材処理が実際に描いた最後のサンプルの座標を使います。補間で線の先へ進めたり、道具を遅らせたりしません。
- 筆先の色は現在の絵の具に連動し、水だけを塗るときは `#BFE3F2` になります。
- 紙の影は道具と同じ形を通常 `(6, 7)`、移動中 `(12, 14)` ずらし、黒の不透明度0.10で描画します。描き始めると0.15秒で通常の位置へ戻します。ぼかし・`ctx.filter` は使いません。
- 出入りは現在の表示範囲の右上の外から0.4秒で行います。短いステップをまたぐ出入りも継続し、シークしても復元できます。
- 左ききは既存のステージ全体の左右反転を使用します。
- `smudge` の `tool: finger` は白い接触円のみ。不透明度0.6、輪郭 `#4B5563` で、指の形は描きません。
- クレヨン・割りばし・綿棒・ティッシュの簡単な形に加え、竹ぐし・スポンジ・ブラシと網の表示関数も用意しました。後者3種類を使う台本はこの試作にはありません。

## 完成チェック

| 指定項目 | 結果 | 確認した内容 |
|---|---|---|
| 画面に手・袖・手袋が出ない | 合格 | 道具一覧16枚とP-02・C-09・W-11を目視。実行時コード・素材・ビルド出力に旧描画の参照なし |
| 先端が描画点に合う | 合格 | P-02の鉛筆、C-09の割りばし、W-11の水・赤の筆を途中で停止して確認。実際の最終描画サンプルへの一致もテスト |
| 筆先が現在の絵の具の色 | 合格 | 一覧の赤・青・水、W-11の水と赤。水の色を含めた状態更新テストも合格 |
| 道具が回転せず、右ききで先が左下 | 合格 | 通常 −55°を固定。曲線でも固定するテストが合格。ねかせるクレヨンは指定どおり描画方向の直角に固定 |
| 左ききで正しく反転 | 合格 | W-11の同じ停止時刻で左右を切り替え、絵・筆・影が一緒に反転することを目視 |
| 台本を一つも書き換えない | 合格 | この作業環境にある3本すべてとmanifestのSHA-256が変更前と一致。未提供の残りの台本は検証対象に含めていません |
| コンソールエラーなし | 合格 | 完成版を再読み込みし、一覧・3本の再生・左右切替・既存の検証を実行。error / warn とも0件 |

## 自動検証

| 検証 | 結果 |
|---|---|
| `npm run typecheck` | 合格 |
| `npm run validate` | 3本の台本とmanifestが合格 |
| `npm test` | 75 / 75 合格（道具関連26件を含む） |
| `npm run build` | 合格 |
| `npm run build:dev` | 合格 |
| 確認ページ「動き・描画を検証」 | 10 / 10 合格 |

画材処理・座標生成・コンパイラ・Player・既存CSS・台本・manifestの保護対象10ファイルは、すべてSHA-256が一致しました。描画結果の最終hashもP-02 `066afe33`、C-09 `97b70e6d`、W-11 `d8c6005c`を維持しています。スクラッチは下地を維持し、水彩のにじみ・乾燥・白の合成の検証も通りました。

証拠：[変更前ハッシュ](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/protected-files-before.json>)、[変更後ハッシュ](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/protected-files-after.json>)、[ブラウザー検証結果](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/browser-checks.txt>)、[コンソール確認](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/console-errors.json>)。

## スクリーンショット

Codexのブラウザー検証でPlaywrightの操作・待機を使い、実際の確認ページを撮影しました。

道具の確認ページ：8種類 × 描画中／持ち上げ中。

![道具の確認ページ](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/tools-gallery.jpg>)

P-02：ステップ1、1.27秒。鉛筆の先端が線の端に一致。

![P-02の途中](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/P-02-mid.jpg>)

W-11：ステップ2、1.08秒。赤い筆先が絵の具を置く点に一致。

![W-11の途中](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/W-11-mid.jpg>)

追加確認：

- [C-09：ステップ3、1.22秒](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/C-09-mid.jpg>)
- [W-11：水だけを塗る、1.30秒](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/W-11-water-mid.jpg>)
- [W-11：同じ1.08秒で左ききへ反転](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/W-11-left.jpg>)

## 変更したファイル：9件

以下はすべて `C:/Users/shudi/Documents/New project/enotane/` 配下です（設計書2本は個別に記載）。

| ファイル | 変更 |
|---|---|
| `src/engine/overlay.ts` | 手のSVG読み込みと描画を除去し、道具描画へ置換 |
| `src/engine/snapshots.ts` | 手の状態を道具の状態に置換。先端・角度・色・持ち上げ・出入りの状態を管理 |
| `src/engine/stage.ts` | 互換アクションを道具だけの動作へ接続。出入りのステップ継続・描画点追従 |
| `src/engine/schema.ts` | 内部の描画所有者と検証文言を道具に変更。手のポーズ予約を除去 |
| `src/dev/main.tsx` | 手の一覧を道具の一覧へ置換 |
| `tests/schema.test.ts` | 道具に変えた検証文言と内部所有者の期待値を更新 |
| `README.md` | 道具のみの表示・新確認ページの案内 |
| `C:/Users/shudi/Downloads/enotane_design.md` | 6-4・6-5の説明、6-6の手の行を更新。関連する素材・描画説明も整合 |
| `C:/Users/shudi/Documents/New project/enotane_design_revised.md` | 現在の改訂設計書の状態管理・描画・確認項目も道具のみへ更新 |

6-6の手の行は「手は描かない。道具だけを表示する」に変更しました。授業の内容や実物の手・安全に関する説明は維持しています。

## 追加した実装ファイル：4件

- `src/engine/tools.ts`：道具の形、固定角度、尺度、影、接触円。
- `src/dev/ToolGallery.tsx`：道具確認一覧16枚とPNG生成ボタン。
- `src/dev/tool-gallery.css`：確認一覧だけのスタイル。
- `tests/tools.test.ts`：先端・角度・色・移動・状態復元・ステップ継続の26件。

この報告書、スクリーンショット6枚、削除記録・ハッシュ記録・ブラウザー検証記録を `docs/tool-only/` に追加しました。`dist/` と `dist-dev/` は再ビルドしました。

## 削除したファイル：18件

以下はすべて `C:/Users/shudi/Documents/New project/enotane/` 配下です。

1. `src/engine/hand.ts`
2. `src/dev/HandPoseGallery.tsx`
3. `src/dev/hand-pose-gallery.css`
4. `src/dev/legacy-hand.ts`
5. `tests/hand.test.ts`
6. `public/assets/hand/glove.svg`
7. `public/assets/hand-before/glove.svg`
8. `public/assets/hand-before/pencil.svg`
9. `public/assets/hand-before/crayon.svg`
10. `public/assets/hand-before/brush-round.svg`
11. `public/assets/hand-before/brush-flat.svg`
12. `public/assets/hand-before/waribashi.svg`
13. `public/assets/hand-before/soft-tools.svg`
14. `docs/hand-redesign/source-before/glove.svg`
15. `docs/hand-redesign/source-before/overlay.ts`
16. `docs/hand-redesign/source-before/stage.ts`
17. `docs/hand-redesign/source-before/snapshots.ts`
18. `docs/hand-redesign/source-before/main.tsx`

[削除確認記録](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/deleted-files.json>)の18件がすべて `deleted: true` です。以前の作業報告とスクリーンショットは履歴として残していますが、旧手描画のソースと素材は削除済みです。道具だけの既存SVG6枚は維持しています。

## 台本とUIを維持するための判断

- W-11の水塗りは入場開始0.3秒後に始まります。0.4秒の入場より先に描画が始まる場合、描画開始時点で筆先を描画点へ合わせます。台本の時刻を変更せず、先端合わせを優先しました。
- UIを変えない指定に従い、既存の保存ボタン「手・説明も含めて保存」の文言は維持しました。保存される絵に手は出ず、道具と説明だけが含まれます。
- 道具一覧のPNG生成後の完了表示は確認しました。この確認用ブラウザーではBlobのダウンロード完了イベントを取得できなかったため、PNGファイルの保存完了は未確認です。要求されたスクリーンショットは上記JPEGとして保存済みです。
- 台本はこの作業環境にある3本を確認しました。69本すべてがここにあるという扱いにはしていません。

確認ページ：[道具の確認ページ](http://127.0.0.1:5186/dev.html#tool-gallery)。サーバーは起動したままです。
