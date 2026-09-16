import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.jsx'

// アプリのエントリーポイント。副作用として index.html の #root 要素に React ツリーを
// マウントする(戻り値なし、この呼び出し自体が画面描画を引き起こす)。
// domain/clientId は Vite の規約により VITE_ プレフィックス付きの環境変数(.env)から
// ビルド時に埋め込まれる。redirect_uri を固定値ではなく window.location.origin にして
// いるのは、ローカル開発/本番など動作環境が変わってもAuth0からのリダイレクト先を
// 都度書き換えずに済ませるため。
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{ redirect_uri: window.location.origin }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)