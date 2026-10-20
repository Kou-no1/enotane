# えのたね 全Phase実装・検証報告

2026年10月9日。対象：`C:/Users/shudi/Documents/New project/enotane`。

ユーザーの「コミット、一気に全項目実装して」に基づき、改訂設計書のPhase 0〜3を実装しました。7モジュール・69レッスン、3ラボ、先生機能、自己記録・設定、印刷、6作品チャレンジ・18作例、7逆引きセット、PNG・動画保存、オフライン対応を備えています。手・袖・手袋を描かず、道具だけを表示する方式を維持しました。

既存のP-02・C-09・W-11はバイト列を変更していません。新しい66本の台本と69件の教材本文を追加しました。実物の画材・授業・iPad実機の検証は未確認で、全教材の`review.status`は`unverified`です。

## 起動

- [製品画面](http://127.0.0.1:5186/)
- [本番ビルドの確認・オフライン保存](http://127.0.0.1:5187/)
- [開発確認ページ](http://127.0.0.1:5186/dev.html)

本番ビルドに開発確認ページは含めません。Gitコミットはローカル保存で、公開・pushは行っていません。

## 実装した項目

| 範囲 | 実装内容 |
|---|---|
| Phase 0 | 元3本の再生・停止・復元・速度・左右・静止画、層・マスク・道具確認、決定的描画 |
| Phase 1：23件 | おすすめ順と一覧、検索・★・お気に入り、4学習段階、準備・安全・問い・活用、スタンプ・設定、先生メモ・大画面・ステップ止め |
| Phase 2：40件追加 | はじき絵・こすり出し・ぼかし・消しゴム・マーブリング等、色まぜ・水の量・構図ラボ、順序付き授業セットURL、A4カード・シート |
| Phase 3：6件追加 | 観察・人物の教材、6チャレンジと各3作例、行事・単元の7逆引き、PNG・字幕付き無音動画、保存教材のオフライン利用 |

本文は「見る→実物でためす→気づく→自分の表現に使う」の4段階です。★は体験・準備の目安で、点数や利用制限に使いません。記録は同じブラウザ内の任意のスタンプで、氏名・作品・回答を保存しません。

O-06は実物の手を観察する問いと、独立した丸・四角・線の図にしています。アニメに手の形を描きません。M-07は専用のマーブリング画材・液を準備例として明記し、製品・学校の扱い方を確認する先生メモを付けました。K-02の色の輪は6有彩色で、白・黒・茶を色相の位置に加えていません。

教材別の安全・準備・ルビ・元台本のSHA256は[教材内容監査](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/content-audit.md>)、描画処理の意味は[エンジン監査](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/engine-audit.md>)を参照してください。

## 完成チェック

| 項目 | 判定 | 確認内容 |
|---|---|---|
| 69教材・ID・本文・参照 | 合格 | 69件が一意。全台本と本文、チャレンジ、逆引きに参照切れなし |
| 全69台本の実描画 | 合格 | 全ステップの開始・途中・終端、戻った後の最終hash一致、左きき静止画を実Canvasで確認 |
| 元3本の画材・台本を維持 | 合格 | 台本のバイト・SHA256一致。画材、紙の質感、Player、ruby等の元ソースは不変 |
| 手・袖・手袋を描かない | 合格 | 実行時の手描画・素材・ポーズなし。道具一覧とP-02・W-11を目視。指こすりは指定の接触円のみ |
| 道具先端と描画点が一致 | 合格 | 最後に描いたサンプルを先端に使用。P-02・C-09・W-11の回帰と途中画像、道具の状態テスト |
| 筆先の色・水・固定角度・影 | 合格 | 色に連動、水は#BFE3F2。通常−55°固定。移動時の影と0.15秒の戻り、0.4秒の出入り。ctx.filterなし |
| 左きき・字幕・注記 | 合格 | ステージ全体を反転。字幕・注記の字形は正方向。URL指定は保存設定を上書きしない |
| 再生・停止・復元・速度 | 合格 | 通常・先生・静止画、ショートカット、復元中の操作を検証。元3本の30/60Hz・0.5/1/1.5倍の画像一致 |
| 比較の同期と読み込み失敗 | 合格 | 長さの違うステップで両方停止・再開。片方未準備・失敗時は共有操作を無効化 |
| 自己記録・設定・保存失敗 | 合格 | 変更・解除・再読み込み、記録OFF、先生初期OFF、リセット、破損・未知版・容量エラーを確認 |
| URLと履歴 | 合格 | ID・無効ID、セット順序・重複除去、mode/kiki、戻る・進むを確認 |
| ラボ | 合格 | 全量0の説明、白と水の分離、タブのキー操作、構図の移動・大きさ・重なり・紙向き |
| A4印刷 | 合格 | 全69カード18ページ、4枠／ページ、全69シート。安全文を保持し、縦横欠けなし。文字最小8.5pt |
| 作品チャレンジ・逆引き | 合格 | 6件×3作例＝18 SVG、7授業セット。参照切れなし。オフラインでも画像読込 |
| PNG・動画 | 合格 | PNG保存、1000×715の字幕付きWebMの実再生、動画トラック1本・音声トラックなし、失敗・中止時の解放 |
| オフライン | 合格 | 保存W-11の再読み込み、未保存教材の説明、共通作例、明示削除。旧版を更新失敗時に保持し、更新は操作後に有効化 |
| 小画面・文字拡大 | 合格 | 教材・設定・先生・比較の4画面×6幅と360px文字200%の28条件。横はみ出しなし |
| 主要UIのキーボードと可読性 | 合格 | フォーカス、再生、タブ、スライダー、印刷ダイアログ、ふりがな・静止画。本文・補助文字の色を調整 |
| コンソール | 合格 | 通常UI・全69Canvas・保存済みオフラインで未処理script errorなし。未保存教材の503は意図した案内 |
| 30fpsの目標 | 未達・実機未確認 | 最終PC追試は通常22.23fps。以前の59fpsの測定もあるが、最終条件の未達を合格に置き換えない。iPad Safariは未確認 |
| 実物での教材レビュー | 未確認 | 全69件で未確認を明記。実物の紙・画材・水量・乾燥時間を使う確認は未実施 |
| iPad Safari・他の実機 | 未確認 | WindowsのヘッドレスEdgeの結果を実機合格に置き換えていない |
| 子ども・先生の授業利用 | 未確認 | 実際の読みやすさ・理解・用具の扱い・印刷機での実寸確認は未実施 |

## 自動検証

最終ソースに対し、`npm run validate`、`npm run typecheck`、`npm test`、`npm run build`、`npm run build:dev`を実行しました。

- 台本・本文：69本、6チャレンジ・18作例、7逆引きセットが合格。
- Nodeテスト：149 / 149 合格（10ファイル）。
- Playwright：最適化後の統合は14件合格、CPU4倍計測1件が起動待ち15秒でタイムアウト。計測をアプリ起動後の再生に合わせた追試3件はすべて合格。製品動作12種と性能記録3種を確認し、性能目標の達成は別に判定しています。
- 依存関係：`npm audit`で報告された脆弱性0件。

証拠：[Playwright結果](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/playwright-results.json>)、[全69Canvas結果](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/all-69-canvas.txt>)、[元3本の回帰](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/original-3-regression.txt>)、[画面幅28条件](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/mobile-layout.json>)、[動画再生](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/video-playback.json>)、[依存監査](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/npm-audit.json>)。

CPU計測の変更後の証拠：[性能追試3件](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/performance-retest.json>)。元の統合タイムアウトも記録に残し、成功したように書き換えていません。

## 性能とメモリ

Windows、Edge 155のヘッドレス、一時プロファイル、1440×1000 CSS px、DPR 1。P-02再生中のRAF間隔120回を計測しました。診断トレースを切ったPCの補助計測です。iPad実機の結果ではありません。

最終測定値は[通常計測](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/desktop-performance.json>)、[CPU4倍低速化](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/cpu-4x-performance.json>)、[復元と画素量](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/restore-performance.json>)に記録しています。初回の未訪問ステップ生成と、訪問済み完成状態の復元を分けて報告します。画素量は推定で、ブラウザプロセス全体やGPUの実メモリではありません。

| 最終追試 | 平均fps / p95間隔 |
|---|---|
| 通常 | 22.23fps / 59.9ms |
| CPU4倍低速化（起動後に制限） | 4.93fps / 1604.5ms |

以前の通常測定は59.0〜59.5fps、最適化後の統合中は28.10fpsでした。測定値は実行条件によって大きく変わっています。この結果だけから原因を断定せず、30fps目標の達成やiPadでの性能を保証しません。最適化後の統合時の[28.10fpsの記録](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/desktop-performance-loaded-host.json>)も保存しています。

| 訪問済み完成画像の復元 | 改善前p95 | 最終p95 | 初回の未訪問生成 |
|---|---:|---:|---:|
| P-02 | 1.1ms | 0.9ms | 1556.3ms |
| C-09 | 0.8ms | 0.6ms | 806.2ms |
| W-11 | 106.8ms | 0.7ms | 2264.4ms |

完成状態を一度訪れた後は、既存の次ステップ開始チェックポイントを再利用します。途中の描画、画材の処理、台本は変更していません。空の層の論理状態、道具の退出、比較表示、キャッシュ消失後の再生成も検証しました。最終復元は50ms目標内ですが、初回生成は長くなるため待機表示を保っています。[改善前の記録](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/restore-performance-before.json>)と区別してください。

全69件の最終復元時点の画素量推定は7.2〜43.8MiB、平均20.89MiBです。スナップショット48MiB・全体推定128MiBの上限内でした。訪問順でキャッシュ量が変わるため、途中のピークや実メモリ量とは同じではありません。

トレース有効時の旧計測は約12.5fpsで、トレース無効の条件と同列に比較しません。[旧計測条件の記録](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/desktop-performance-with-tracing.json>)を残しています。

## スクリーンショットと保存例

道具確認ページ：鉛筆、筆（赤・青・水）、クレヨン（立てる・ねかせる）、割りばし、接触円。描画中・持ち上げ中を並べています。

![道具の確認](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/tools.png>)

![P-02の途中](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/P-02-mid.png>)

![W-11の途中](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/W-11-mid.png>)

- [ホーム](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/home.png>)
- [P-03：濃淡のメーター](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/P-03-mid.png>)
- [C-10：こすり出し](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/C-10-mid.png>)
- [W-07：左きき](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/W-07-left.png>)
- [構図ラボ](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/composition-lab.png>)
- [360px](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/mobile-360.png>) / [文字200%](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/mobile-360-text-200.png>)
- [長い準備文を含むA4カード](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/print-longest-cards.png>) / [ためし描きシート](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/print-worksheet.png>)
- [オフラインW-11](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/offline-W-11.png>)
- [保存した動画P-02](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/P-02.webm>)

## 変更ファイルと決定事項

正確な追加・変更ファイルは[ファイル一覧](<C:/Users/shudi/Documents/New project/enotane/docs/full-implementation/changed-files.txt>)に記録しています。今回の全Phase実装で削除したファイルはありません。以前の手関連18ファイル削除は[道具のみの変更報告](<C:/Users/shudi/Documents/New project/enotane/docs/tool-only/report.md>)に記録済みです。

主な追加は`src/app`の製品UI・各機能、`src/store`の記録、`src/content`の教材検証、`scene/techniques/mixing`の描画、新66台本、教材本文・作例、Service Worker、生成ソース、Node・E2E検証とこの報告です。改訂設計書では今回の全Phase実装範囲とO-06の手を描かない方針を明記しました。

ねかせたクレヨンは最初の塗り区間と直角の角度に固定し、腹の中央を描画点へ合わせます。動画は対応MIMEを調べてから保存し、未対応ブラウザではPNGを案内します。読み上げは端末内の日本語音声が利用できるときだけ有効にします。これらは実装上の選択として確定しました。

M-07の準備例の出典：[ニッカー公式のマーブリング製品](https://nicker-enogu.com/product_cat/marbling)、[公式FAQ](https://nicker-enogu.com/contact/)。製品差・紙・液・廃液の扱いを実物で確認したという意味ではありません。
