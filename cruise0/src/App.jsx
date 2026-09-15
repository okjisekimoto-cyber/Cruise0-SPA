import { useAuth0 } from '@auth0/auth0-react'

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
  if (!user.email_verified) {
    return (
      <div>
        <h1>メールアドレスが未検証です</h1>
        <p>{user.email} 宛の確認メールをご確認ください。</p>
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          Log Out
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