# AIUSD Skill - Official MCP TypeScript Client

完整的 AIUSD MCP (Model Context Protocol) 技能包，使用官方 TypeScript SDK 实现，解决了"Session ID is required"的401问题。

## 🎯 解决的核心问题

- ✅ **正确的MCP协议实现** - 使用官方SDK，自动处理initialize握手和Session ID
- ✅ **Bearer Token认证** - 支持多种token源，优先级管理
- ✅ **工具链统一** - 只需Node.js，无需Python依赖
- ✅ **类型安全** - 完整TypeScript支持
- ✅ **生产就绪** - 官方维护，协议兼容性保证

## 🚀 快速开始

### 1. 安装依赖

```bash
# 构建项目
./build.sh

# 或手动构建
npm install
npm run build
```

### 2. 设置认证 (任选其一)

#### 方法A: 环境变量 (最简单)
```bash
# 访问 https://chatgpt.dev.alpha.dev/oauth/login 获取token
export MCP_HUB_TOKEN="Bearer eyJ..."
```

#### 方法B: 使用 mcporter
```bash
# 直接使用 mcporter (推荐方式)
npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd

# 或安装 mcporter 后使用
npm install -g mcporter
mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd
```

#### 方法C: CLI参数
```bash
aiusd-skill --token "Bearer eyJ..." tools
```

### 3. 基本使用

```bash
# 测试连接
npm run test
# 或 aiusd-skill test

# 列出所有工具
aiusd-skill tools

# 查看账户余额
aiusd-skill balances

# 获取交易账户
aiusd-skill accounts

# 查看交易历史
aiusd-skill transactions --limit 5

# 直接调用工具
aiusd-skill call genalpha_get_balances
```

## 🛠 命令参考

### 全局选项
```bash
-s, --server <url>     MCP服务器地址 (默认: https://mcp.alpha.dev/api/mcp-hub/mcp)
-t, --token <token>    Bearer认证token
--timeout <ms>         请求超时时间 (默认: 30000ms)
--help                 显示帮助
--version              显示版本
```

### 可用命令

#### `test` - 测试连接
```bash
aiusd-skill test
```

#### `tools` - 列出工具
```bash
aiusd-skill tools                 # 基本列表
aiusd-skill tools --detailed      # 详细信息
```

#### `call` - 调用工具
```bash
# 基本调用
aiusd-skill call genalpha_get_balances

# 带参数调用
aiusd-skill call genalpha_execute_intent \
  --params '{"chain_id":"solana:mainnet-beta", "intent":"<buy>...</buy>"}'

# 格式化输出
aiusd-skill call genalpha_get_balances --pretty
```

#### 快捷命令
```bash
aiusd-skill balances              # 获取余额
aiusd-skill accounts              # 获取账户
aiusd-skill transactions -l 10    # 获取10笔交易记录
```

## 🏗 项目结构

```
src/
├── index.ts           # 入口点和错误处理
├── cli.ts             # CLI命令行接口
├── mcp-client.ts      # MCP客户端核心 (使用官方SDK)
└── token-manager.ts   # Token管理和多源支持

dist/                  # 编译输出
package.json          # 项目配置
tsconfig.json         # TypeScript配置
build.sh              # 构建脚本
test-client.sh        # 测试脚本
```

## 🔐 认证配置

### Token 源优先级
1. **CLI参数** - `--token "Bearer xxx"`
2. **环境变量** - `MCP_HUB_TOKEN` 或 `AIUSD_TOKEN`
3. **mcporter配置** - 自动检测mcporter认证状态
4. **本地文件**:
   - `~/.mcp-hub/token.json`
   - `~/.mcporter/auth.json`

### 获取Token
访问 https://chatgpt.dev.alpha.dev/oauth/login 完成OAuth登录并复制JWT token。

## 🧪 开发和测试

### 构建项目
```bash
./build.sh                    # 完整构建和验证
npm run build                 # 仅编译
npm run dev                   # 开发模式
```

### 运行测试
```bash
./test-client.sh              # 完整测试套件
npm test                      # 基本连接测试
npm run build && node dist/index.js --help  # 手动验证
```

### 全局安装
```bash
npm install -g .
aiusd-client --help           # 全局命令可用
```

## 📊 与之前方案对比

| 特性 | 手写实现 | 官方SDK实现 |
|------|----------|------------|
| **协议兼容性** | ⚠️ 可能不完整 | ✅ 官方保证 |
| **Session管理** | 🔧 手动实现 | ✅ 自动处理 |
| **错误处理** | 🔧 自定义 | ✅ 标准化 |
| **维护成本** | ❌ 高 | ✅ 低 |
| **类型安全** | ⚠️ 部分 | ✅ 完整 |
| **依赖管理** | 🔧 手动 | ✅ npm生态 |

## 🎉 成功案例

```bash
$ aiusd-skill test
ℹ️ Testing connection to MCP server...
✅ Authentication token found
🔄 Connecting to MCP server: https://mcp.alpha.dev/api/mcp-hub/mcp
✅ Successfully connected to MCP server
✅ Connection test successful

📋 Connection Info:
{
  "connected": true,
  "serverUrl": "https://mcp.alpha.dev/api/mcp-hub/mcp",
  "client": "aiusd-skills v1.0.0"
}
✅ Disconnected from MCP server

$ aiusd-skill balances --pretty
✅ Authentication token found
🔄 Connecting to MCP server: https://mcp.alpha.dev/api/mcp-hub/mcp
✅ Successfully connected to MCP server
ℹ️ Calling tool: genalpha_get_balances
🔄 Calling tool: genalpha_get_balances
✅ Tool 'genalpha_get_balances' executed successfully

📋 Tool Result:
{
  "balances": {
    "custody": "4837.69 AIUSD",
    "staking": "5892.50 sAIUSD",
    "total_value_usd": "10730.19"
  }
}
```

## 🤝 与mcporter协作

这个客户端与mcporter完美配合：

1. **mcporter** - 负责OAuth认证和工具调用
2. **aiusd-client** - 提供友好的CLI接口和自动token检测

### 使用mcporter
```bash
# 直接调用工具
npx mcporter call --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd.genalpha_get_balances

# 列出所有工具
npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd
```

### 两种客户端对比
```bash
# mcporter 方式 (直接工具调用)
npx mcporter call --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd.genalpha_get_balances

# 我们的客户端 (友好的CLI接口)
aiusd-skill balances --pretty
```

通过官方SDK实现，这个方案既解决了技术问题，又确保了长期的可维护性和协议兼容性。