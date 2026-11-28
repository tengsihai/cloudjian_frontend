# cloudjian_frontend

CloudJian 前端。本仓库目前是**脚手架**：构建产物推到 S3 的 `web/` 前缀并失效 CDN，
页面只有一个构建信息与网关联通性探测，真正的界面由前端团队接着写。

## 流水线

| 工作流 | 触发 | 干什么 | 凭证 |
| --- | --- | --- | --- |
| `ci.yml` | PR → `release`、push `release` | `npm ci` + `tsc --noEmit` + `vite build` | 无 |
| `deploy.yml` | push `release` | 校验「commit 来自已合并 PR」→ OIDC → 读 SSM → 构建 → `s3 sync` → 失效 CDN → 线上探测 | `environment: release` |

分支模型与 infra 一致：`feat/*` 开发 → PR 到 **`release`**（合并即发布）→ `main` 只归档。
`release` 直推会被第一条校验拦下。

首次使用需在仓库 Settings → Environments 建 `release`，加变量：

| 变量 | 值 |
| --- | --- |
| `AWS_ROLE_ARN` | `arn:aws:iam::790354569983:role/cloudjian-gha-frontend-role` |

该角色只能写 `s3://<bucket>/web/*`、只能对这一个分发做失效、只能读 `/cloudjian/*` 参数。

## 部署契约

构建期从 SSM 读出来注入为 `VITE_*` 环境变量（`src/vite-env.d.ts` 有类型）：

| SSM 参数 | 注入变量 | 用途 |
| --- | --- | --- |
| `/cloudjian/api-url` | `VITE_API_URL` | 后端 HTTP API 基址 |
| `/cloudjian/user-pool-id` | `VITE_USER_POOL_ID` | Cognito 用户池 |
| `/cloudjian/client-id` | `VITE_CLIENT_ID` | Cognito 客户端 |
| `/cloudjian/bucket` | — | 静态资源落 `web/` 前缀 |
| `/cloudjian/cdn-domain` | — | 发布后线上探测 |
| `/cloudjian/cdn-arn` | — | 末段即分发 ID，用于失效 |

缓存策略：带 hash 的静态资源 `max-age=31536000, immutable`；`index.html` `no-cache`，
发版即时生效。`s3 sync --delete` 会清掉旧资源。

## 本地

```bash
npm ci
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

本地 `VITE_*` 为空属正常（页面会提示「未注入」）。不要本地往 S3 推、不要本地做 CDN 失效：
发布只能由 `deploy.yml` 执行。
