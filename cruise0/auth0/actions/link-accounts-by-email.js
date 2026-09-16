const { ManagementClient } = require('auth0');

/**
 * 同一メールアドレスの DB ユーザーとソーシャルユーザーを自動リンクする。
 *
 * Post Login トリガーに置く理由:
 *   Post User Registration はデータベースコネクションでしか発火せず、
 *   ソーシャル経由で作成されたユーザーでは走らないため、
 *   リンク処理の実行ポイントは Post Login が唯一の選択肢になる。
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log('--- action start:', event.user.user_id, 'verified:', event.user.email_verified);

  // ガード1: 未検証メールではリンクしない（セキュリティ上の必須条件）
  //   攻撃者が被害者のメールで DB アカウントを作成しておくと、
  //   被害者の Google ログインが攻撃者のアカウントに吸収され、乗っ取りが成立する。
  //   Google は常に検証済みで返るが、DB コネクションは
  //   メール検証フローを有効化しない限り false のままである点に注意。
  if (!event.user.email_verified) {
    console.log('SKIP: email not verified');
    return;
  }

  // ガード2: すでにリンク済みなら何もしない
  //   毎ログインで Management API を呼ぶとレートリミットを圧迫するため、
  //   identities 配列の長さで早期に打ち切る。
  if (event.user.identities.length > 1) {
    console.log('SKIP: already linked');
    return;
  }

  // 資格情報は Action の Secrets から取得し、コードには埋め込まない
  //   ⚠ キー名は大文字小文字を区別する。ダッシュボード側の登録名と
  //     完全一致していないと undefined になり、
  //     `getaddrinfo ENOTFOUND undefined` という分かりにくい形で失敗する。
  const client = new ManagementClient({
    domain: event.secrets.domain,
    clientId: event.secrets.client_id,
    clientSecret: event.secrets.client_secret,
  });

  try {
    // users-by-email を使う理由:
    //   検索 API (search v3) は結果整合のため、直前に作成されたユーザーを
    //   取りこぼす可能性がある。リアルタイム照合には遅延の影響を受けにくい
    //   こちらのエンドポイントを使う。
    const res = await client.users.listUsersByEmail({ email: event.user.email });
    // SDK のバージョンにより生配列 / { data } のどちらかで返るため吸収する
    const users = Array.isArray(res) ? res : res.data;
    console.log('candidates:', users.map((u) => `${u.user_id}(v=${u.email_verified})`).join(' , '));

    // リンク先(primary)の選定
    //   - 自分自身は除外
    //   - 相手側も検証済みであることを必須にする（片側だけの検証では上記の攻撃が成立する）
    const primary = users.find(
      (u) => u.user_id !== event.user.user_id && u.email_verified
    );
    if (!primary) {
      console.log('SKIP: no primary candidate');
      return;
    }

    // user_id は "provider|id" 形式。今ログイン中のユーザーを secondary としてリンクする
    const [provider, userId] = event.user.user_id.split('|');
    await client.users.identities.link(primary.user_id, { provider, user_id: userId });
    console.log('LINKED to', primary.user_id);

    // リンク直後のセッションは secondary のままなので、明示的に primary へ切り替える。
    //   これを呼ばないと、発行されるトークンの sub が secondary の user_id になり、
    //   アプリ側から見て「リンクされていない」のと同じ状態になる。
    api.authentication.setPrimaryUser(primary.user_id);
  } catch (err) {
    // 意図的な fail open:
    //   Management API の一時障害でログイン全体を落とすのは可用性上わりに合わない。
    //   ただし失敗が無言で積み上がると重複プロファイルが再び増えるため、
    //   本番では Log Streams で外部に転送し、アラートを張ることを前提とする。
    console.log('ERROR:', err.name, err.message);
    console.log('CAUSE:', JSON.stringify(err.cause, Object.getOwnPropertyNames(err.cause || {})));
  }
};