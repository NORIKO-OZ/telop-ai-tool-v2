# Redis設定ガイド

AIテロップツールv2では、ユーザー管理と用語辞書の保存にRedisを使用しています。

## 🚀 クイックセットアップ

### 1. Upstash Redis（推奨）

1. [Upstash Console](https://console.upstash.com/)にアクセス
2. 「Create Database」をクリック
3. データベース名を入力（例：`telop-ai-tool`）
4. リージョンを選択（日本の場合：`ap-northeast-1`）
5. 作成後、「REST API」タブから以下をコピー：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 3. 動作確認

```bash
# 開発サーバー起動
npm run dev

# 別ターミナルで環境チェック
curl http://localhost:3005/api/check-env
```

## 🔄 代替オプション

### Vercel KV（Vercelユーザー向け）

Vercelでデプロイする場合：

1. Vercel Dashboardで「Storage」タブ
2. 「Create Database」→「KV」を選択
3. 環境変数が自動設定される：
   ```env
   KV_REST_API_URL=...
   KV_REST_API_TOKEN=...
   ```

## 🛠️ トラブルシューティング

### Redis接続エラー

```bash
# 環境変数確認
curl http://localhost:3005/api/check-env

# Redis接続テスト
curl http://localhost:3005/api/debug-redis
```

### よくある問題

1. **URL/Token形式エラー**
   - URLは`https://`で始まる必要があります
   - Tokenに余分なスペースが含まれていないか確認

2. **CORS エラー**
   - ローカル開発では通常発生しません
   - 本番環境では適切なドメイン設定が必要

3. **権限エラー**
   - Upstashの無料プランでは月間制限があります
   - 使用量は[Console](https://console.upstash.com/)で確認可能

## 📊 データ構造

### 保存されるデータ

- **ユーザー情報**: `user:{userId}`
- **使用量統計**: `usage:{userId}`
- **用語辞書**: `dict:{userId}:{dictionaryId}`
- **アクティブ辞書**: `active_dicts:{userId}`

### データの初期化

初回起動時に自動的に作成されます：

```typescript
// デフォルトユーザー
{
  id: "default",
  role: "user",
  limits: {
    dailyRequests: 50,
    monthlyRequests: 1000,
    maxDurationMinutes: 10
  }
}
```

## 🔒 セキュリティ

- Redis TokenとURLは機密情報として扱ってください
- `.env.local`は`.gitignore`に含まれています
- 本番環境では環境変数で設定してください

## 📈 運用監視

### 使用量確認

```bash
# 管理者パネルで確認（要管理者権限）
# または直接API呼び出し
curl http://localhost:3005/api/admin/users
```

### パフォーマンス最適化

- 辞書データは圧縮保存されています
- 自動的な期限切れデータのクリーンアップ
- 接続プールによる効率的なアクセス

---

**困った時は**: [GitHub Issues](https://github.com/your-repo/issues)で質問してください