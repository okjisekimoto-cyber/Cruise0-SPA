# Cruise0 SPA — Auth0 デモ

Auth0 Technical Account Manager テクニカルチャレンジ（Challenge #3）として作成した Proof of Concept です。

Cruise0 のモダナイゼーション案件に対して Auth0 がどう応えられるかを示しています。ReactJS の Single Page Application に、ソーシャルログイン、メール検証の強制、アカウントの自動リンク、ブランディングされた New Universal Login を組み合わせた構成です。

---

## 要件と実装の対応

| # | 要件 | 実装 |
| --- | --- | --- |
| 1 | ReactJS SPA での Auth0 対応 | React + Vite、`@auth0/auth0-react` による Authorization Code Flow + PKCE |
| 2 | サインアップ / メール・パスワードログイン / Google ログイン | データベースコネクションと Google ソーシャルコネクション（Auth0 開発用キー）を Universal Login 経由で提供 |
| 3 | 同一メールアドレスのアカウントリンク | Post Login Action（`cruise0/auth0/actions/link-accounts-by-email.js`）で自動リンク |
| 4 | メール未検証時のエラー表示 | SPA が ID トークンの `email_verified` を参照し、保護ビューへのアクセスを遮断 |
| 5 | New Universal Login のブランディング | 船のロゴ、タイトル「Welcome Aboard」、説明文「Log in to book your travel with Cruise0」 |
| 6 | 船の背景画像 | Universal Login のブランディング設定で指定 |

---

## 構成

```
ブラウザ（React SPA）
  │  Authorization Code + PKCE
  ▼
Auth0 Universal Login  ──  データベースコネクション（メール / パスワード）
  │                    └─  Google ソーシャルコネクション
  │
  ▼  Post Login トリガー
Action: Link Accounts by Email
  │  Management API（read:users / update:users）
  ▼
リンク済みユーザープロファイル  ──▶  ID トークンを SPA へ返却
```

SPA はパブリッククライアントであり、Management API の権限を一切持ちません。特権操作はすべて Action 内で完結し、Action は別の Machine to Machine アプリケーションとして認証します。

---

## 前提

- Node.js 20 以降
- Auth0 テナント
- Google ソーシャルコネクション（本デモでは Auth0 の開発用キーで十分）

---

## Auth0 テナントの設定

以下のパスは Auth0 ダッシュボードの左メニューを指します。ダッシュボードは一部が刷新途中のため、記載と 1 階層ずれている場合があります。

### 1. Single Page Application

**Applications → Applications → Create Application** から **Single Page Web Applications** を選択して作成します。

作成したアプリケーションを開き、**設定（Settings）** タブで以下を設定します。

| 項目 | 値 |
| --- | --- |
| Allowed Callback URLs | `http://localhost:3000` |
| Allowed Logout URLs | `http://localhost:3000` |
| Allowed Web Origins | `http://localhost:3000` |

### 2. データベースコネクション

**Authentication → Database → Username-Password-Authentication** を開き、**アプリケーション（Applications）** タブで SPA に対して有効化します。

メール検証はアカウントリンクの必須前提です（後述のセキュリティ上の注記を参照）。

### 3. Google ソーシャルコネクション

**Authentication → Social → Google** を開き、**アプリケーション（Applications）** タブで SPA に対して有効化します。

本デモでは Auth0 の開発用キーを使用しています。本番テナントでは **設定（Settings）** タブに自前の Google OAuth 認証情報を登録します。

### 4. Machine to Machine アプリケーション

**Applications → Applications → Create Application** から **Machine to Machine Applications** を選択します。**Auth0 Management API** を指定し、以下 2 つのスコープのみを付与します。

- `read:users`
- `update:users`

### 5. Post Login Action

**Actions → Library → Create Custom Action** を選択します。名前を `Link Accounts by Email`、トリガーを **Login / Post Login** として作成し、下記ファイルの内容を貼り付けます。

https://github.com/okjisekimoto-cyber/Cruise0-SPA/blob/main/cruise0/auth0/actions/link-accounts-by-email.js

エディタ左側のサイドバーから設定します。

- **箱のアイコン**が **Dependencies**。`auth0` パッケージを追加し、バージョンを固定します。
- **鍵のアイコン**が **シークレット**。以下 3 件を登録します。

| キー | 値 |
| --- | --- |
| `domain` | テナントドメイン（例：`dev-xxxxxxxx.us.auth0.com`。スキームと末尾スラッシュを含めない） |
| `client_id` | Machine to Machine アプリケーションの Client ID |
| `client_secret` | Machine to Machine アプリケーションの Client Secret |

シークレットのキー名は大文字小文字を区別し、コードと完全に一致させる必要があります。登録後は画面右上の **デプロイ** を押してください。シークレットはデプロイ済みバージョンに紐づくため、追加しただけでは反映されません。

続いて **Actions → Triggers → post-login** を開き、右側のパネルから作成した Action を Start と Complete の間にドラッグして **適用（Apply）** を押します。

### 6. ブランディング

#### ロゴと背景画像

**Branding → Universal Login → Update branding theme** を開きます。左メニューの **Styles** から、ロゴは **Widget**、背景画像は **Page** で設定します。

**Widget**（ログインフォーム上部に表示されるロゴ）

| 項目 | 値 |
| --- | --- |
| Logo url | `https://raw.githubusercontent.com/okjisekimoto-cyber/Cruise0-SPA/refs/heads/main/cruise0/public/logo_150_150_w_trans.png` |
| Logo position | 中央揃え |
| Logo | 表示サイズ（px） |

Logo url を指定しない場合は Auth0 のロゴが使われます。

**Page**

| 項目 | 値 |
| --- | --- |
| Favicon url | `https://raw.githubusercontent.com/okjisekimoto-cyber/Cruise0-SPA/refs/heads/main/cruise0/public/favicon.png` |
| Background image url | `https://raw.githubusercontent.com/okjisekimoto-cyber/Cruise0-SPA/refs/heads/main/cruise0/public/background.jpg` |

画像は公開アクセス可能な https の URL である必要があります（`raw.githubusercontent.com` など）。ローカルファイルのパスは指定できません。背景画像は幅 2000px 以上を推奨します。

中央のプレビューで反映を確認したうえで、右上の **Save And Publish** を押します。

#### タイトルと説明文

**Back to Universal Login** で戻り、**Edit text and translations** を開きます。画面上部で以下を選択します。

- Language：`English (en)`
- Prompt：`login`
- Screen：`login`

右側のフォームに入力します。

| 項目 | 値 |
| --- | --- |
| title | `Welcome Aboard` |
| description | `Log in to book your travel with Cruise0` |

プレビューで反映を確認し、保存します。項目ごとに反映用のアイコンが付く UI もあるため、変更後は必ず全体を保存する操作まで行ってください。

New Universal Login ではログインとサインアップが別プロンプトとして扱われます。Prompt を `signup` に切り替えると、そちらのテキストを個別に設定できます。

最終的な反映確認は、ダッシュボードのプレビューではなくシークレットウィンドウで実画面を開いて行ってください。

---

## ローカルでの実行

```bash
git clone https://github.com/okjisekimoto-cyber/Cruise0-SPA.git
cd Cruise0-SPA/cruise0
npm install
cp .env.example .env
```

コピーした `.env` を編集し、自分のテナントの値を設定します。

```
VITE_AUTH0_DOMAIN=dev-xxxxxxxx.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
```

開発サーバーを起動します。

```bash
npm run dev
```

`http://localhost:3000` を開きます。

この 2 つの値は設計上公開されるものです。SPA である以上ブラウザに配布されます。シークレットをこのファイルに置くことはなく、`.env` は gitignore 対象です。

---

## セキュリティ上の注記

**リンクには両方の identity が検証済みであることを必須としています。** メールアドレスの一致のみを条件にすると、攻撃者が被害者のメールアドレスでデータベースアカウントを作成しておくことで、被害者の Google identity をそのアカウントに取り込ませることができてしまいます。Action は両側の `email_verified` を確認し、満たさない場合はリンクを行いません。データベースコネクションでメール検証を有効にする必要があるのはこのためです。無効のままではフラグが false のままとなり、リンクは成立しません。

**SPA には Management API の権限を持たせていません。** リンク処理は `read:users` と `update:users` に限定した別の Machine to Machine アプリケーションが実行し、その認証情報は Action のシークレットに保持され、ブラウザにもこのリポジトリにも渡りません。

**Action は意図的に fail open としています。** Management API の呼び出しが失敗した場合、エラーをログに記録したうえでログイン自体は成功させます。一時的な API 障害ですべてのログインを遮断するのは可用性の観点で割に合いません。ただし失敗が無言で積み上がると重複プロファイルが気づかれないまま増えるため、本番環境では Log Streams による転送とアラートを組み合わせる前提です。

---

## デモ範囲外の論点と本番での考慮事項

以下は認識したうえで、意図的にデモの範囲外としています。

**primary をどちらにするか。** 現在の Action は、メールアドレスが一致する検証済みユーザーのうち最初に見つかったものにリンクします。デモではデータベースユーザーが先に作成されるため結果的にそちらが primary になります。本番ではデータベース側の identity を明示的に選択します。ソーシャルコネクションを後から解除しても残るためです。ただし、既にアプリケーションのデータが紐づいているアカウントを primary にする判断もあり、案件ごとに決める論点です。

**メタデータはマージされません。** Auth0 はリンク時に `user_metadata` / `app_metadata` を自動マージせず、リンク後は secondary 側のメタデータを取得できなくなります。本番ではリンク前に統合する実装が必要です。

**`sub` クレームが変化します。** リンク後、secondary 側の `user_id` は ID トークンから消えます。アプリケーションのデータベースが `sub` をキーにしている場合、旧値から新値へのマッピング移行が必要です。

**既存重複のバックフィル。** 本実装は新規の重複発生を防ぎますが、既存の重複は解消しません。これはバッチ処理になります。`POST /api/v2/jobs/users-exports` でユーザーをエクスポートし、メールアドレスでグルーピングし、メタデータを統合したうえでリンクします。レートリミットを考慮したスロットリングを行い、まず開発テナントで検証します。

**カスタムドメイン。** 本番テナントでは `login.cruise0.com` のようなカスタムドメインから Universal Login を提供します。ブランド体験が一貫し、サードパーティ Cookie の問題も回避できます。