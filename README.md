# Type Playground

文字に触れると、塗りが輪郭とアンカーポイントへ変わる、編集できるWebサイトです。

[サイトを開く](https://tenten-10-10.github.io/type-playground/)

## 使い方

- 3つのテキスト欄を書き換えると、上のバナーへ即時反映します。日本語・英字に対応。
- 文字へマウスを重ねると輪郭と点が現れます。スマートフォンはタップ、キーボードはキャンバスにフォーカスして矢印キーで選択できます。
- 文字色、背景色、キャプション、角括弧、ホバー表現を変更できます。
- 「再生」で順番にエフェクトを再生します。
- PNGは2880×608px、SVGはフォントを含まないパスとして書き出します。
- 入力内容は外部へ送信しません。編集内容の自動保存はなく、再読み込みで初期表示へ戻ります。

## ローカル起動

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

http://127.0.0.1:4173/ を開きます。

## ビルド

```sh
npm run build
npm run test:sites
```

`dist/client` が静的サイト一式です。

GitHub Pagesでは `PAGES_BASE=/type-playground/ npm run build` でプロジェクトURLに合わせたビルドを作成します。`main` へのpushでGitHub Actionsがビルドと確認を行い、GitHub Pagesへ自動公開します。

## Ko-fi

`src/support-config.js` の `KOFI_URL` に、確認済みの自分の公開支援ページURLを設定すると、フッターのKo-fiバナーが有効になります。未設定時は「準備中」で表示し、外部へ移動しません。

支援を受け取るには、[Ko-fiでページを作成](https://ko-fi.com/account/register)し、[支払い設定](https://help.ko-fi.com/hc/en-us/articles/115003980093-How-do-I-get-paid)を完了します。このサイトには決済用の秘密鍵やトークンを置きません。

## 実装と参照

- React / Vite / Canvas / [opentype.js](https://github.com/opentypejs/opentype.js)
- UIアイコン: Phosphor Icons
- 英字: [Arimo](https://github.com/google/fonts/tree/main/ofl/arimo)
- 日本語: [Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp)
- 両フォントはwght=400の静的TTFとして同梱。ライセンスは `public/fonts/*-OFL.txt`。
- フォントの字形から輪郭と点を生成するため、日本語を入力しても同じエフェクトが使えます。
