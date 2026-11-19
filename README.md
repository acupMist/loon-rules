# loon-rules

Loon 远程分流规则，按业务拆开订阅。本地 `[Rule]` 只留 `FINAL` 和临时试验条目，日常域名走这里。

匹配顺序（Loon 3.0.3+）：**本地规则 > 插件规则 > 本仓库订阅**。订阅之间按配置文件从上到下，先命中先生效。

## 订阅地址

根路径：`https://raw.githubusercontent.com/acupMist/loon-rules/main/`

| 文件 | 用途 | 建议策略 |
|---|---|---|
| `gmail.list` | Gmail IMAP/SMTP/POP、`mail.google.com` | `✉️ 谷歌邮件`（不要跟全家桶同一出口） |
| `gemini.list` | Gemini / AI Studio + 同出口依赖（accounts / googleapis / gstatic） | `Gemini出口`（家宽优先） |
| `google.list` | Google 通用域，**不含 Gmail、不含 Gemini 专用** | 打 Gemini 时也绑 `Gemini出口`；否则 `谷歌全家桶` |
| `openai.list` | ChatGPT / Sora | `OpenAI` |
| `grok.list` | xAI / X / SpaceX（**不含** meta.ai） | `Grok` |
| `muse.list` | Meta Muse / Meta AI（美国限定） | `Muse`（美国优先；勿绑 Grok/日本） |
| `claude.list` | Anthropic / Claude，含网页端/API/Artifacts | `Claude` |
| `cursor.list` | Cursor / Anysphere | `美国手动策略` |
| `douyin.list` | 抖音国内，**不含 TikTok 共用域** | `抖音策略`（家里可 DIRECT） |
| `qqmusic.list` | QQ 音乐 | `QQ` |
| `devproxy.list` | Docker / JetBrains | `🚀 策略选择` |
| `paypal.list` | PayPal / Braintree / Venmo 核心域 | `PayPal` |
| `fanqie.list` | 番茄小说作家专区与阅读端（字节 CDN） | `番茄作家`（公司网切代理节点；家里可切 DIRECT） |
| `yinhai.list` | 银海办公域（yinhai.com / yinhaiyun.com / yinhaisoft.com） | `DIRECT` |
| `direct.list` | Apple、部分国内直连 | `DIRECT` |


**重要：** `grok.list` 已去掉 `meta.ai`；若旧缓存仍命中 Grok，请刷新远程规则或把 `muse.list` 排在 `grok.list` 之前。

Meta Muse 必须美国出口：订 `muse.list` → `Muse`，并把原先绑到 Grok 的 `meta-ai.list` 改绑 `Muse` 或关掉（本仓库 `muse.list` 已覆盖）。

打 Gemini 时务必让 `gemini.list` 与 `google.list` **同一出口（家宽）**；只把 `gemini.google.com` 走家宽、登录/API 走日本节点，会被判区域限制。

TikTok 不要用本仓库，继续用 kelee / blackmatrix7 的 TikTok 列表，并排在 `douyin.list` **之后**（本地规则若再写 `DOMAIN-KEYWORD,snssdk` 仍会抢走 TikTok）。

`fanqie.list` 覆盖作家后台（`fanqienovel.com`）和字节 CDN。公司网会拦这些国内域名，所以本列表必须排在 `direct.list`、`REGION_SPLITTER` 和本地 `GEOIP,CN,DIRECT` 之前。策略组用 `番茄作家`：公司 Wi-Fi 选一个代理节点，家里选 `DIRECT`。

不要再用 `https://yfamilys.com/rule/ai.list` 当「其余 AI」：那份会把 `stripe.com`、`sentry.io`、`www.bing.com`、`challenges.cloudflare.com` 以及 DigitalOcean / Vultr 整段 ASN 送去美国。Claude 用本仓库 `claude.list`。

## 国内慢的常见原因与推荐本地规则

Loon 匹配顺序：**本地规则 > 插件规则 > 远程订阅**。

若 `FINAL` 指向代理（例如 `美国自动场景`），而 `direct.list` 又较薄，未命中的国内域名/IP 会绕代理变慢。

推荐本地 `[Rule]`（**不要把 FINAL 改成 DIRECT**）：

```
GEOIP,CN,DIRECT
FINAL,美国自动场景
```

银海办公域订 `yinhai.list`（`DIRECT`），不要再在本地重复写 `DOMAIN-SUFFIX,yinhaiyun.com`。

`GEOIP,CN,DIRECT` 只能写在本地规则里，不能放进远程 list。

`[Remote Rule]` 建议顺序：LAN / CN REGION / `direct.list` 靠前 → 业务代理列表 → 广告列表靠后。

---

## iOS `[Remote Rule]` 示例

把 Gmail 放在 Google 前面；抖音放在 TikTok 前面。

```
https://raw.githubusercontent.com/acupMist/loon-rules/main/gmail.list, policy=✉️ 谷歌邮件, tag=谷歌邮件, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/gemini.list, policy=Gemini出口, tag=Gemini, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/google.list, policy=Gemini出口, tag=谷歌本地, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/openai.list, policy=OpenAI, tag=OpenAI本地, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/paypal.list, policy=PayPal, tag=PayPal, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/grok.list, policy=Grok, tag=Grok, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/muse.list, policy=Muse, tag=Muse, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/claude.list, policy=Claude, tag=Claude, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/cursor.list, policy=美国手动策略, tag=Cursor, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/fanqie.list, policy=番茄作家, tag=番茄作家, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/yinhai.list, policy=DIRECT, tag=银海, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/douyin.list, policy=抖音策略, tag=抖音, enabled=true
```

`fanqie.list` 必须排在 `direct.list` 和 `REGION_SPLITTER` 之前。策略组示例：

```
番茄作家 = select,日本自动,美国自动,香港自动,DIRECT,台湾自动,新国自动
```

公司 Wi-Fi 用日本自动（美国节点 TLS 会被掐）；家里可在 Loon 里把本组切回 `DIRECT`。

Mac 上 Gmail / Google / OpenAI / Grok 已经在订本仓库；加上 `claude.list`、`cursor.list` 后，本地 `[Rule]` 里对应的 DOMAIN 可以删掉。


## 插件

| 文件 | 用途 |
|---|---|
| `plugins/genshin-luna.plugin` | 米游社原神每日签到 |
| `plugins/cdtft-ad.plugin` | 天府通去广告（弹窗、浮窗、首页广告与福利推荐、乘车码页滚动广告、财富菜单与资讯、优惠券角标；不拦乘车码） |
| `plugins/agentrouter-user-agent.plugin` | AgentRouter 模型请求 User-Agent 改写（按接口区分 Claude Code / Codex，可自定义） |

天府通插件订阅：

```
https://raw.githubusercontent.com/acupMist/loon-rules/main/plugins/cdtft-ad.plugin
```

装上后在 Loon 里给 `tft-app.cdtft.cn`、`shequ.cdtft.cn`、`metroact.cdtft.cn`、`ams-cdn.cdtft.cn`、`smpex.cdtft.cn` 打开 HTTPS 解密。首页宫格里的「村糖购 / 出行头条 / 先学后付」会去掉，「公积金」「更多」以及乘车码、天府通卡、充值保留；底部「财富」菜单会被移除（依据 2026-11-16 TFTAPP 9.6.0 抓包）。

脚本地址固定到具体 commit（`cdn.jsdelivr.net/gh/acupMist/loon-rules@<sha>`），改动脚本后必须重新钉一次 commit，避免 jsdelivr 对 `@main` 的长缓存让 Loon 拿到旧脚本。

### AgentRouter 模型请求 UA

插件订阅：

```
https://raw.githubusercontent.com/acupMist/loon-rules/feat/agentrouter-user-agent/plugins/agentrouter-user-agent.plugin
```

适用于 **ZCode、OpenCode、Pi、Claude Code、Codex** 发往 `https://agentrouter.org` 或 `https://www.agentrouter.org` 的模型 API 请求。按接口而非客户端名称选择 UA：

| 接口 | 参数 | 默认 UA |
|---|---|---|
| `/v1/messages` 及子路径（含 `count_tokens`） | `claudeUA` | `claude-cli/2.1.197 (external, cli)` |
| 其余 `/v1/` 接口（含 `responses`、`chat/completions`、`models`） | `codexUA` | `codex_cli_rs/0.170.0` |

默认值只是可修改的客户端格式示例，**不是 AgentRouter 官方指定或保证可用的固定值**。Claude 格式参考[客户端 API 请求记录](https://github.com/anthropics/claude-code/issues/72879)；Codex 使用[官方 UA 前缀](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/default_client.rs)，版本参考本机 CLI，省略系统/终端后缀。在插件参数里填写自己的完整 UA 即可覆盖，某项留空则保留该接口的原 UA；「启用 UA 改写」可整体关闭。

安装后：

1. 在 Loon 开启 HTTPS 解密，启用插件的 `agentrouter.org`、`www.agentrouter.org` 两个域名，安装并信任 Loon CA。
2. 确保客户端请求实际经过 Loon。容器、远程服务器或客户端的云端中转请求不一定经过本机；请求发往其他域名时本插件不匹配。
3. Node.js 客户端若报证书错误，给启动它的进程设置 `NODE_EXTRA_CA_CERTS=/绝对路径/Loon-CA.pem`；Codex 可设置 `SSL_CERT_FILE=/绝对路径/包含受信根证书的CA文件.pem`。不要用关闭 TLS 校验的方式解决。
4. 重新发起一次模型请求，在 Loon 请求记录中核对**改写后的请求头**（如果界面有区分，查看替换请求头，而不是原始请求头）。

插件仅返回请求头：保留 Authorization、API Key、Cookie 和其他头，不读取正文、不保存鉴权信息、不修改响应或分流策略。网页登录、`/api/` 控制台、`/v1beta/` Gemini API、其他 API 域名及 WebSocket 请求不改。HTTPS 解密涉及整个目标域名，脚本范围才限定为 `/v1/`。本插件只改 UA，不改变服务端权限、额度或模型可用性。

本地测试（无需依赖）：

```
node --check scripts/agentrouter-user-agent.js
node --test tests/agentrouter-user-agent.test.js
```

本地脚本及匹配检查不等同于 Loon 实机验收；安装后仍需核对请求头。插件内脚本地址固定到具体 commit，更新脚本时需同步更新该地址。
