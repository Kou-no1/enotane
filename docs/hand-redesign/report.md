# 手の描画と道具の保持：改修報告

確認日：2026-10-09。プレビュー：<http://127.0.0.1:5186/dev.html#hand-pose-gallery>。

手をカプセルと角丸四角の組み合わせで再実装しました。奥の手・道具・手前の指の順で描き、人差し指と親指が道具に重なるようにしました。画材の描画処理、3本の台本、既存の操作UIは保持し、指定された開発用ポーズ一覧だけを追加しています。

## 改善した仕組み

- 指・親指・腕はカプセル、手の甲は角丸四角。指の幅・長さ・丸み・色は指定された数値から決定します。手の自由曲線SVGはアニメでは使用しません。
- 奥と手前のそれぞれで、全パーツを輪郭色で拡張して塗り、全パーツを白で重ねます。パーツ間の内側の線を消し、短い境目の線だけを追加します。輪郭の厚さは0.22uです。
- 袖は手首につながった長いカプセルで、ステージの対角線より十分長く伸ばします。袖口には0.5uの帯を1本置きます。
- `TOOL_GEOMETRY` に既存の道具SVGの `tip` と `grip` を定義しました。鉛筆・筆・割りばしは35%、立てるクレヨンは45%。手と道具を同じ変換で移動・回転します。
- 接点は、その時刻までに実際に描いた最後のサンプルに固定します。描画点より先へ補間して浮いて見える問題を防ぎます。手だけの遅延追従はありません。
- `HAND_SCALE = 0.12`。ズーム時も表示ステージに対する手の大きさを約12%に保ちます。基準角はtripod 35°、lay 12°、point 35°、描画中の揺れは最大±4°です。
- 紙の影は同じ手の形をずらして一度塗ります。非描画の移動ではずらす距離を増やします。ぼかし・`ctx.filter` は使いません。
- tripod・lay・pointを実装しました。pointは指先自体が道具です。pinch・dabは未実装の関数の枠を用意しました。

## 変更・追加したファイル

| ファイル | 内容 |
| --- | --- |
| `src/engine/hand.ts`（追加） | 部品、3ポーズ、輪郭・影・袖、tip/grip、道具との3層描画、将来ポーズの枠 |
| `src/engine/overlay.ts` | 手のSVG描画を新しい描画関数へ接続。説明表示は維持 |
| `src/engine/snapshots.ts` | 手のポーズ・角度・持ち上げ状態の保存、道具選択、接点の決定 |
| `src/engine/stage.ts` | 手の状態更新と描画引数だけを変更。画材・描画層・合成処理は維持 |
| `src/main.tsx` | 一覧のimportとコンポーネント追加の2行のみ |
| `src/dev/HandPoseGallery.tsx`（追加） | 3ポーズ×8方向×左右の48セル、道具切替、変更前比較、PNG保存、手だけの補助測定 |
| `src/dev/hand-pose-gallery.css`（追加） | 一覧内に限定したスタイル |
| `src/dev/legacy-hand.ts`（追加） | 変更前の手を比較用に表示する保存版 |
| `tests/hand.test.ts`（追加） | 数値・接点・8方向・反転・揺れ・移動・保存・ズームなど15件 |
| `public/assets/hand-before/glove.svg`（追加） | 比較用の旧手画像 |
| `public/assets/hand-before/pencil.svg`（追加） | 比較用の旧鉛筆画像 |
| `public/assets/hand-before/crayon.svg`（追加） | 比較用の旧クレヨン画像 |
| `public/assets/hand-before/brush-round.svg`（追加） | 比較用の旧丸筆画像 |
| `public/assets/hand-before/brush-flat.svg`（追加） | 比較用の旧平筆画像 |
| `public/assets/hand-before/waribashi.svg`（追加） | 比較用の旧割りばし画像 |
| `public/assets/hand-before/soft-tools.svg`（追加） | 比較用の旧補助道具画像 |

`docs/hand-redesign/` にこの報告、スクリーンショット、PNG出力、変更前ソースの控え、検証記録、SHA比較記録を追加しました。既存の画材・台本・道具SVGなど20ファイルは変更前とSHA-256がすべて一致しています。比較結果は `unchanged-files-after.json` に保存しています。

## 完成チェック

| 項目 | 結果 | 確認内容 |
| --- | --- | --- |
| 道具が指の間を通り、人差し指が上に乗る | 確認済み | 3層描画とtripod全方向を目視。鉛筆・丸筆・平筆・立てるクレヨン・割りばしで確認 |
| 指の太さ・丸みがそろい、でこぼこがない | 確認済み | 指ごとの指定比率と丸い端をテストし、48セルを目視 |
| 外形の輪郭がつながり、太さが一定 | 確認済み | グループ単位の2回塗り、0.22uの拡張、各角度の接続を確認 |
| 袖がステージ外まで続く | 確認済み | 一覧の全方向・左右とP-02/C-09/W-11の途中のコマで確認 |
| tipが描画位置と合う | 確認済み | P-02の線の端、C-09の削っている端、W-11の色を置く位置を目視。回転・ズーム時の座標テストも合格 |
| どの角度・左右反転でも崩れない | 確認済み | 48セル、tripodの5道具、実アニメW-11の左右反転を確認 |
| iPad Safari相当で30fps以上、ctx.filterなし | **性能は未確認** | `ctx.filter`なし。Windowsの手だけの補助測定は59.9fps。iPad/Safariの全アニメ測定は行えていません |

## スクリーンショット

PlaywrightのUI操作と接続ブラウザーのスクリーンショット機能で取得しました。

### P-02の途中のコマ

同じ「まっすぐ」の描画中です。変更前は1.35秒、変更後は1.50秒で一時停止しており、厳密に同一時刻の比較ではありません。

変更前：

![P-02変更前](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/p02-before.jpg>)

変更後：

![P-02変更後](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/p02-after.jpg>)

### ポーズ一覧

変更前には3ポーズが存在しなかったため、比較用に保存した旧イラストを同じ方向・左右に並べています。変更前一覧は1倍、変更後一覧は細部確認用に1.5倍です。これは一覧だけの拡大率です。

変更前：

![ポーズ一覧変更前](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/poses-before.jpg>)

変更後：

![ポーズ一覧変更後](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/poses-after.jpg>)

PNG保存ボタンによる実際のダウンロードも確認しました。48セルを3840×2482pxにまとめた `poses-after.png` を保存しています。`poses-before.png` も同梱しました。

### 道具・実アニメの追加確認

各道具の8方向×左右：`tripod-brush-round.jpg`、`tripod-brush-flat.jpg`、`tripod-crayon.jpg`、`tripod-waribashi.jpg`。

C-09の割りばし（第3ステップ2.13秒）：

![C-09変更後](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/c09-after.jpg>)

W-11の筆（第2ステップ1.37秒）：

![W-11変更後](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/w11-after.jpg>)

W-11の左きき：

![W-11左きき](<C:/Users/shudi/Documents/New project/enotane/docs/hand-redesign/w11-left-after.jpg>)

## 検証結果

- `npm run typecheck`：合格。
- `npm run validate`：3本の台本とmanifestが合格。
- `npm test`：64件合格（手の15件を含む）。
- `npm run build` と `npm run build:dev`：合格。
- ブラウザーの既存描画検証：10/10合格。最終画像hashは変更前と同じ：P-02 `066afe33`、C-09 `97b70e6d`、W-11 `d8c6005c`。
- スクラッチは上塗り338200→321138画素、下地hash `9e2a0d1c` を保持。
- 水マスク160981画素、にじみ領域外0画素、乾燥後wet/wetMaskは0、顔料97016画素を保持。
- 戻る・再開始・速度変更・Renderer再生成、および22アクションの55フレームを確認。詳細は `browser-verification.txt`。

### 性能測定の条件と限界

WindowsのCodex内蔵ブラウザー、表示領域947×884px。手だけを描く10フレームの準備後、120フレームを測定しました。

| 測定 | 結果 |
| --- | --- |
| 平均フレームレート | 59.9fps |
| フレーム間隔の95パーセンタイル | 16.80ms |
| 手の描画時間の平均 | 0.312ms |

これはiPad/Safariの結果ではありません。画材描画・再構築・ズーム中の新しい形状生成を含む全アニメの性能試験でもありません。実アニメの確認中の表示値はP-02 59fps、C-09 21fps、W-11 59fpsでした。自動操作中の瞬間値であり、安定したベンチマークではありませんが、全アニメで常時30fpsを保証する根拠にはできません。測定条件を `performance.json` に保存しています。

一覧の48 Canvasは画素だけで約31.6MiB、PNG作成時には一時的に約36.4MiBが追加されます。これらは既存Rendererの推定メモリ量に含まれません。

## 残る点・採用した判断

1. iPad Safariの実機または同等環境で、描画・ズームを含む全アニメの30fps確認が必要です。この環境での合格扱いにはしていません。
2. 未指定だった持ち方の基準角はtripod/point 35°、lay 12°にしました。`HAND_POSE_ANGLES` から変更できます。
3. 台本のサブパス間に移動時間がない箇所では、手と道具は次の開始点へ同時に移ります。正の移動時間がある点々などでは持ち上げ移動と影の変化を使います。画材・台本を保持するため、サブパスの時間配分は変更していません。
4. pinch/dabは指定どおり未実装です。既存のティッシュ・綿棒が使われる場合は、新しいtripodへの暫定対応を明記してあります。今回の3作例には影響しません。

