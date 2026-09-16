import { useAuth0 } from '@auth0/auth0-react'

// アプリのルートコンポーネント。
// 引数: なし。戻り値: Auth0の認証状態に応じた4種類の画面(ローディング/エラー/未ログイン/
// メール未検証/ログイン済み)のいずれか1つのJSX。
// 副作用: ボタン押下時に loginWithRedirect / logout を呼び出し、ブラウザのリダイレクト
// (外部サイトへの遷移、またはログアウト後のトップページ遷移)を発生させる。
// 各分岐は isLoading -> error -> isAuthenticated -> email_verified の順に評価しており、
// 後段の判定(例: user.email_verified)はそれより前の状態が確定していないと user が
// null/undefined になり得るため、この順序を入れ替えてはいけない。
export default function App() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0()

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>エラー: {error.message}</p>

  // 未ログイン
  if (!isAuthenticated) {
    return (
      <div>
        <h1>Cruise0</h1>
        <button onClick={() => loginWithRedirect()}>Log In / Sign Up</button>
      </div>
    )
  }

    // 要件4: メール未検証
  // 利用している接続はAuth0のDatabase接続とGoogleソーシャル接続のみ。Googleはアカウント作成時に
  // メール確認を必須としており、Auth0のGoogle接続はその verified_email をそのまま email_verified に
  // マッピングするため、ここが false のまま返ることは基本的にない。
  if (!user.email_verified) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', fontFamily: 'system-ui', padding: 24 }}>
        <h1 style={{ fontSize: 24 }}>メールアドレスの確認が必要です</h1>
        <p style={{ color: '#555', lineHeight: 1.8 }}>
          <strong>{user.email}</strong> 宛に確認メールをお送りしました。<br />
          メール内のリンクから認証を完了したうえで、再度ログインしてください。
        </p>
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          ログアウト
        </button>
      </div>
    )
  }

  // ログイン済み
  return (
    <div>
      <h1>Welcome Aboard, {user.name}</h1>
      <img src={user.picture} alt="" width={80} />
      <p>Email: {user.email}</p>
      <p>User ID: {user.sub}</p>
      <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
        Log Out
      </button>
    </div>
  )
}