# AIUSD-skills Architecture Overview

## OAuth 方案

### 方案一 启动本地服务

#### 流程

**1. 认证流程（OAuth 2.0 Authorization Code Flow）**

完整的 OAuth 2.0 标准流程：

1. 检查本地 token → 2. 启动本地服务器 → 3. 打开浏览器 → 4. 用户登录 → 5. 接收回调 → 6. 交换 token → 7. 保存 token

关键端点：

- 授权端点: https://chatgpt.dev.alpha.dev/oauth/login
- Token 端点: https://chatgpt.dev.alpha.dev/api/user-service/v1/oauth/token
- 回调地址: http://localhost:8765/callback

**2. 客户端配置**

```
CLIENT_ID = "client_feb954e1-c0b5-4e20-9186-7c4633a6fa87"
CLIENT_SECRET = os.getenv("OAUTH_CLIENT_SECRET", "")  # 环境变量
```

**3. Token 管理**

存储位置：`~/.mcp-hub/token.json`

```json
{
  "token": "Bearer eyJ...",           // JWT access token
  "refresh_token": "refresh_xxx",     // 刷新 token (如果有)
  "timestamp": 1738123456,            // 创建时间戳
  "expires_in": 86400                 // 24小时有效期
}
```

**4. 自动化认证机制**

智能检查逻辑 (check_auth.sh)：

1. 检查 token 文件是否存在
2. 检查文件年龄 (>24小时 = 过期)
3. 验证 token 格式有效性
4. 自动触发重新登录 (如需要)

#### 当前限制

1. 会话管理：使用 LocalSessionManager，不支持跨请求状态持久化
2. Token 刷新：需要重新完整登录流程
3. 客户端密钥：依赖环境变量设置
4. 单一提供者：目前仅支持 GenAlpha OAuth
5. 环境限制：pc 桌面 + 浏览器 + Python + requests 库

---

### 方案二 复制 JWT Token

#### 存储位置

`~/.mcp-hub/token.json`

#### 数据格式

```json
{
  "token": "Bearer eyJ...",
  "timestamp": 1738123456,
  "expires_in": 86400
}
```

#### 用户交互

- **用户:** "查余额"
- **系统:** 未找到 token，请：
  1. 访问 https://chatgpt.dev.alpha.dev/oauth/login 登录
  2. 复制 JWT token
  3. 手动创建文件：

```bash
mkdir -p ~/.mcp-hub
cat > ~/.mcp-hub/token.json << 'EOF'
{
  "token": "Bearer YOUR_TOKEN_HERE",
  "timestamp": 1738123456,
  "expires_in": 86400
}
EOF
```

- **用户:** [手动创建文件]
- **用户:** "查余额"
- **系统:** 找到 token → 执行查余额

#### Skill 逻辑

**skill 内部直接读取**

```python
def get_token():
    token_file = Path.home() / ".mcp-hub" / "token.json"
    if token_file.exists():
        return load_token(token_file)
    else:
        return prompt_user_setup()
```

---

### 方案三 MCPorter

```
┌──────────────────────────────┐
│        LLM Runtime           │
│   (Claude / OpenAI / etc)    │
└─────────────┬────────────────┘
              │
              │  tool call
              │
              ▼
┌──────────────────────────────┐
│            Skill             │
│  (你写的 Skill / Tool glue)  │
│                              │
│  - 不处理 OAuth              │
│  - 不维护 Session            │
│  - 只做代理                  │
└─────────────┬────────────────┘
              │
              │  mcporter call
              │
              ▼
┌──────────────────────────────┐
│           mcporter           │
│        (CLI / Runtime)       │
│                              │
│  ✔ OAuth Browser Login       │
│  ✔ Token Persist             │
│  ✔ 自动带 Authorization      │
│  ✘ 不维护 browser session   │
└─────────────┬────────────────┘
              │
              │ Authorization: Bearer <access_token>
              │
              ▼
┌──────────────────────────────┐
│           MCP Server         │
│        /mcp  (SSE)           │
│                              │
│  Auth Middleware             │
│   - verify JWT               │
│   - resolve user_id          │
│                              │
│  Tool Dispatcher             │
│   - genalpha_*               │
│   - aiusd_*                  │
│                              │
│  Business Logic              │
└──────────────────────────────┘
```

#### mcporter 的方案

mcporter 是一个「基于 OAuth Bearer Token 的无状态 MCP CLI 客户端」，不是浏览器、也不维护 Session。

#### mcporter 在整个链路里做了什么

**1. 它解决的问题**

- 把 MCP server 暴露成 CLI 可调用的 tool
- 自动处理：MCP discovery、tool schema、OAuth 授权（一次性）、token 存储 & 自动带 Authorization header

**2. 它的鉴权模型（核心）**

只有这一种：`Authorization: Bearer <access_token>`

- token 通过 OAuth browser flow 拿到
- mcporter 本地持久化 token
- 后续 call 自动带上

- ✅ 完全无状态
- ❌ 不维护 browser session
- ❌ 不使用 cookie
- ❌ 不要求 Session ID

**3. mcporter 明确「不负责」的东西**

mcporter 设计上就不碰：

- Session ID
- Cookie
- CSRF token
- Origin / Referer
- Wallet connect session
- 长连接会话状态

这些都被认为是：「浏览器专属安全上下文」。

**4. mcporter 的调用模型**

每次命令都是：`mcporter call <server>.<tool>(args)`

等价于：一次新的 MCP client + 一次新的 SSE 连接 + 一个 Bearer token，不会复用上一次的连接 / session。

#### 对比

| 模型                  | 适合谁            | mcporter |
| --------------------- | ----------------- | -------- |
| Browser + Session     | 人类用户          | ❌       |
| Agent / CLI + Token   | 自动化 / Agent    | ✅       |


#### MCP Server 401 问题分析

  问题描述

  MCP Hub 服务器对 Agent/CLI 工具返回 401 错误：Unauthorized: Session ID is required

  根本原因

  服务器认证逻辑 StreamableHttpService + LocalSessionManager 的组合要求Session ID，但 Agent 工具只提供 JWT Bearer token

  技术细节

  当前服务器认证流程：
  1. 检查 Authorization header ✅
  2. 检查 Session ID ❌ 失败 → 401

  Agent 工具提供的认证：
  - Bearer token (JWT) ✅
  - 无浏览器会话 ❌

  架构问题

  混合了两种认证模型：
  - 浏览器场景: OAuth → Session/Cookie
  - Agent场景: OAuth → Bearer Token

  但服务器强制要求浏览器会话模式。

「Session ID（不管是 Local 还是 Remote）是 server 侧为浏览器设计的有状态机制，mcporter 作为无状态 MCP 客户端只支持 Bearer Token 这种显式鉴权，因此无法也不应该处理 browser session。」

## MCP 调用的实际实现

### 最终采用方案：官方 MCP TypeScript SDK

经过实际开发测试，选择了 **方案一** 但使用官方 MCP TypeScript SDK 实现：

#### 技术栈选择
```json
{
  "@modelcontextprotocol/sdk": "^1.10.0",
  "commander": "^12.0.0",
  "zod": "^3.25.0"
}
```

#### 核心实现架构

```typescript
// src/mcp-client.ts - MCP 客户端核心
class McpClient {
  constructor(options: McpClientOptions) {
    // 自定义 fetch 函数注入 Bearer Token
    const authFetch = async (url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', this.options.authToken);
      return fetch(url, { ...init, headers });
    };

    // 使用官方 SDK 的 HTTP 传输
    this.transport = new StreamableHTTPClientTransport(
      new URL(this.options.serverUrl),
      { fetch: authFetch }
    );
  }
}
```

#### Session 管理解决方案

**问题**: MCP 服务器要求 Session ID，但 Agent/CLI 工具只提供 Bearer Token

**解决**: 官方 MCP SDK 自动处理 session 初始化和管理
- SDK 在连接时自动建立会话
- Bearer token 通过自定义 fetch 函数注入到每个请求
- 无需手动管理 Session ID

#### Token 管理策略

实现了多源 token 管理，按优先级获取：

```typescript
// src/token-manager.ts
export class TokenManager {
  static async getToken(): Promise<string> {
    // 1. 环境变量
    if (process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN) {
      return token;
    }

    // 2. mcporter credentials
    const mcporterToken = await this.getTokenFromMcporterCredentials();
    if (mcporterToken) {
      return mcporterToken;
    }

    // 3. 本地 token 文件
    const localToken = await this.getTokenFromFile();
    if (localToken) {
      return localToken;
    }

    throw new Error('No authentication token found');
  }
}
```

### mcporter 集成方案

#### 认证命令
```bash
# 正确的 mcporter 认证语法
npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd
```

#### credentials.json 解析
```typescript
private static async getTokenFromMcporterCredentials(): Promise<string | null> {
  const credentialsPath = join(homedir(), '.mcporter', 'credentials.json');
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));

  if (credentials.entries) {
    for (const [key, entry] of Object.entries(credentials.entries as any)) {
      const typedEntry = entry as any;
      if (typedEntry.tokens?.access_token) {
        return typedEntry.tokens.access_token;
      }
    }
  }
  return null;
}
```

### 零配置部署实现

#### 智能入口点 (index.js)
```javascript
class AiusdSkill {
  async isReady() {
    return (
      existsSync(join(__dirname, 'node_modules')) &&
      existsSync(join(__dirname, 'dist')) &&
      await this.checkAuth()
    );
  }

  async quickSetup() {
    // 自动安装依赖
    if (!existsSync(join(__dirname, 'node_modules'))) {
      execSync('npm install --silent', { cwd: __dirname, stdio: 'inherit' });
    }

    // 自动构建
    if (!existsSync(join(__dirname, 'dist'))) {
      execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
    }

    // 自动认证设置
    if (!await this.checkAuth()) {
      await this.setupAuth();
    }
  }
}
```

#### 自动化流程
1. **依赖检查**: 检查 node_modules 和 dist 目录
2. **智能安装**: 缺失时自动执行 `npm install` 和 `npm run build`
3. **认证检查**: 多源 token 检测，失败时引导用户设置
4. **一键执行**: 所有设置完成后直接执行功能

### 实际解决的问题

#### 1. 401 Session ID 错误
- **根因**: 服务器混合了 Browser Session 和 Agent Bearer Token 两种认证模式
- **解决**: 使用官方 MCP SDK 自动管理 session，通过自定义 fetch 注入 Bearer token

#### 2. 依赖管理复杂性
- **问题**: 用户需要手动安装依赖、构建、配置
- **解决**: 智能入口点自动检测并执行所有必需步骤

#### 3. TypeScript 工具链
- **选择**: 统一使用 Node.js + TypeScript，避免多语言复杂性
- **优势**: 与 MCP 官方 SDK 生态完全兼容

#### 4. 打包部署
- **策略**: .skill 文件包含完整 node_modules，保证零依赖运行
- **Git 策略**: 开发时 ignore node_modules，打包时包含

### 开发经验总结

#### 技术选择经验
1. **MCP SDK 版本**: 最初使用 v1.25.3 遇到兼容性问题，回退到 v1.10.0 稳定工作
2. **传输方式**: SSE transport 不适合 HTTP 场景，HTTP transport 是正确选择
3. **mcporter 语法**: `mcporter auth <server>` 语法错误，正确语法是带参数的 list 命令

#### 实现难点
1. **TypeScript 类型兼容**: SDK 客户端构造函数需要正确的参数类型
2. **Authentication 流程**: 需要理解 mcporter credentials.json 的数据结构
3. **零配置目标**: 平衡自动化程度和用户控制权

#### 最佳实践
1. **错误处理**: 每个认证源都要有独立的错误处理
2. **用户体验**: 失败时提供清晰的下一步操作指导
3. **开发 vs 生产**: 设计文档保留用于开发，.skill 包用于分发

### 后续改进方向

1. **token 自动刷新**: 检测 token 过期并自动触发重新认证
2. **更多认证源**: 支持更多 OAuth providers
3. **缓存机制**: 工具列表和结果缓存提升响应速度
4. **错误恢复**: 更智能的网络错误重试机制

## Agent 模式重写 (v2.0)

### 重写背景

从 CLI-based skill 转换为 Claude Code 纯 Agent 模式，提供更自然的对话式体验。

### 架构变化

#### v1.0 CLI 架构
```
用户命令 → CLI解析 → MCP Client → 工具调用 → 结果输出
```

#### v2.0 Agent 架构
```
用户自然语言 → Claude理解 → Agent工具调用 → MCP工具 → 结构化结果 → Claude自然语言回复
```

### 技术实现差异

| 方面 | v1.0 CLI 模式 | v2.0 Agent 模式 |
|------|---------------|----------------|
| 用户界面 | 命令行参数 | 自然语言对话 |
| 入口点 | `index.ts` + `cli.ts` | `mcp-hub-tools.skill` |
| 工具调用 | 手动指定工具名 | Claude智能选择 |
| 错误处理 | 终端输出 | 抛出可解释异常 |
| 依赖管理 | Commander.js | 仅核心MCP SDK |
| 输出格式 | 彩色终端 | 结构化JSON |

### 新的文件结构

```
mcp-hub-tools/
├── mcp-hub-tools.skill    # 主入口：工具函数导出
├── lib/
│   ├── token-manager.ts   # 认证管理（移除CLI输出）
│   └── mcp-client.ts      # MCP客户端（移除终端日志）
├── package.json           # 简化依赖
├── tsconfig.json          # ES2022 + ESNext
├── setup.js               # 自动化设置
├── test.js                # Agent模式测试
└── README.md              # Agent使用文档
```

### 核心API设计

Agent模式提供简洁的函数式API：

```javascript
// v1.0 CLI 方式
$ aiusd-client call genalpha_get_balances

// v2.0 Agent 方式
const balances = await getAiusdBalances();
```

#### 主要工具函数

1. **`getAiusdBalances()`** - 余额查询
2. **`executeTradeIntent(params)`** - 交易执行
3. **`stakeAiusd(params)`** - AIUSD质押
4. **`withdrawToWallet(params)`** - 资金提取
5. **`getTransactionHistory(params)`** - 交易记录
6. **`testConnection()`** - 连接测试

### 用户体验提升

#### 对话式交互
```
用户: "查看我的AIUSD余额"
Claude: 我来帮你查看AIUSD余额...
[调用 getAiusdBalances()]
Claude: 📊 您当前的余额：
- 托管账户：0.00 AIUSD
- 质押账户：20.98 sAIUSD
- 总价值：约 $21.00
```

#### 智能参数解析
```
用户: "用100刀买SOL"
Claude: 我来帮你执行这笔交易...
[调用 executeTradeIntent({amount: 100, from: "USDC", to: "SOL"})]
Claude: ✅ 交易已提交！预计1-2分钟完成
```

### 认证简化

移除了CLI相关的认证提示，改为异常驱动：

```javascript
// v1.0: 终端输出认证指导
TokenManager.printTokenInstructions();

// v2.0: 抛出带指导的异常
throw new Error('No authentication token found. Please set up OAuth authentication first.');
```

### 技术优化

1. **移除终端依赖**: 所有 console.log 改为结构化返回
2. **简化参数**: 去掉 CLI 参数解析逻辑
3. **模块化设计**: 每个功能独立导出函数
4. **类型安全**: 完整的 TypeScript 类型定义

### 部署优势

- **更小体积**: 12.6MB vs 35.7MB (去掉Commander.js等)
- **零配置**: 无需学习CLI命令
- **自然交互**: 融入Claude对话流程
- **智能调用**: Claude自动选择合适工具

### 兼容性

保持完全的MCP协议兼容，认证机制不变：
1. 环境变量 (MCP_HUB_TOKEN)
2. mcporter credentials
3. 本地token文件

## OAuth-frontend 升级

### 当前支持的钱包

- 仅支持 Phantom 钱包 (Solana 生态)
- 代码中硬编码了 `solana:mainnet-beta` 作为链 ID

### 移动端 Deeplink 支持

移动端通过 `phantomDeeplink.js` 实现了完整的 deeplink 流程：

1. 连接流程: `connectPhantom()` → Phantom App 连接
2. 签名流程: `signMessage()` → Phantom App 签名
3. 回调处理: 处理来自 Phantom App 的回调

关键文件：

- `LoginPage.js:38-46`: 检测移动端设备
- `LoginPage.js:209-216`: 移动端连接逻辑
- `phantomDeeplink.js`: 完整的 deeplink 实现

### 局限性

- 只支持 Phantom 钱包，不支持其他钱包 (如 Solflare, Glow 等)
- 只支持 Solana 网络
- PC 端需要浏览器插件，移动端使用 deeplink

---

### LoginV3 实现架构设计

#### 3.1 核心组件结构

```
LoginPageV3.tsx
├── PrivyAuthWrapper (新建)
│   ├── Multi-wallet 连接逻辑
│   ├── OAuth challenge-verify 集成
│   └── 错误处理和重试机制
├── WalletSelector (复用/改进)
│   ├── Privy 钱包列表
│   ├── 移动端 deeplink 支持
│   └── 社交登录选项
└── AuthState 管理
    ├── 钱包连接状态
    ├── OAuth 参数处理
    └── 重定向逻辑
```

#### 3.2 技术实现要点

**依赖安装：**

```json
{
  "@privy-io/react-auth": "^3.5.0",
  "@privy-io/wagmi": "^2.0.2",
  "@rainbow-me/rainbowkit": "^2.2.8"
}
```

> `@rainbow-me/rainbowkit` 可选，用于更好的 UI

**环境变量配置：**

```
VITE_PRIVY_APP_ID=your_app_id
VITE_PRIVY_CLIENT_ID=your_client_id
```

#### 3.3 与现有 OAuth 后端集成

Challenge-Verify 流程保持不变：

1. 前端请求 `/api/user-service/v1/oauth/challenge`
2. 用户签名 (Privy 处理多钱包签名)
3. 前端发送 `/api/user-service/v1/oauth/verify`
4. 后端验证并返回 OAuth code

关键改进点：

- 多链 CAIP-2 支持: `eip155:1` (ETH), `eip155:56` (BSC), `solana:mainnet-beta`
- 统一签名格式: Privy 自动处理不同钱包的签名格式转换
- 移动端兼容: Privy 的 WalletConnect 集成解决移动端 deeplink 复杂性

#### 3.4 移动端解决方案

Privy 自动处理：

- **WalletConnect**: 移动端钱包连接协议
- **Universal Links**: 自动检测和调用钱包 App
- **Fallback 机制**: 钱包未安装时的降级处理

相比当前 `phantomDeeplink.js` 的优势：

- 无需手动管理密钥对和会话状态
- 支持更多钱包 (MetaMask Mobile, Trust Wallet 等)
- 统一的连接体验

#### 4. 实现步骤规划

**Phase 1: 基础集成**

1. 安装 Privy SDK 和相关依赖
2. 创建 PrivyProvider 配置 (复制 aiusd-react 模式)
3. 基础钱包连接功能

**Phase 2: OAuth 集成**

1. 集成现有的 challenge-verify 流程
2. 处理多链 chainId 格式转换
3. OAuth 参数传递和重定向逻辑

**Phase 3: 高级功能**

1. 社交登录集成 (Google/Twitter)
2. 嵌入式钱包支持
3. 移动端优化和测试