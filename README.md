# loon-rules

Loon 远程分流规则，按业务拆开订阅。本地 `[Rule]` 只留 `FINAL` 和临时试验条目，日常域名走这里。

匹配顺序（Loon 3.0.3+）：**本地规则 > 插件规则 > 本仓库订阅**。订阅之间按配置文件从上到下，先命中先生效。

## 订阅地址

根路径：`https://raw.githubusercontent.com/acupMist/loon-rules/main/`

| 文件 | 用途 | 建议策略 |
|---|---|---|
| `gmail.list` | Gmail IMAP/SMTP/POP、`mail.google.com` | `✉️ 谷歌邮件`（不要跟全家桶同一出口） |
| `google.list` | Google / Gemini，**不含 Gmail** | `谷歌全家桶` |
| `openai.list` | ChatGPT / Sora | `OpenAI` |
| `grok.list` | xAI / X / Meta AI / SpaceX | `Grok` |
| `claude.list` | Anthropic / Claude，不含支付/验证码/云厂商 ASN | `其余AI` 或独立 Claude 组 |
| `cursor.list` | Cursor / Anysphere | `美国手动策略` |
| `douyin.list` | 抖音国内，**不含 TikTok 共用域** | `抖音策略`（家里可 DIRECT） |
| `qqmusic.list` | QQ 音乐 | `QQ` |
| `devproxy.list` | Docker / JetBrains | `🚀 策略选择` |
| `direct.list` | 银海、Apple、部分国内直连 | `DIRECT` |

TikTok 不要用本仓库，继续用 kelee / blackmatrix7 的 TikTok 列表，并排在 `douyin.list` **之后**（本地规则若再写 `DOMAIN-KEYWORD,snssdk` 仍会抢走 TikTok）。

不要再用 `https://yfamilys.com/rule/ai.list` 当「其余 AI」：那份会把 `stripe.com`、`sentry.io`、`www.bing.com`、`challenges.cloudflare.com` 以及 DigitalOcean / Vultr 整段 ASN 送去美国。Claude 用本仓库 `claude.list`。

## iOS `[Remote Rule]` 示例

把 Gmail 放在 Google 前面；抖音放在 TikTok 前面。

```
https://raw.githubusercontent.com/acupMist/loon-rules/main/gmail.list, policy=✉️ 谷歌邮件, tag=谷歌邮件, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/google.list, policy=谷歌全家桶, tag=谷歌本地, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/openai.list, policy=OpenAI, tag=OpenAI本地, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/grok.list, policy=Grok, tag=Grok, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/claude.list, policy=其余AI, tag=Claude, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/cursor.list, policy=美国手动策略, tag=Cursor, enabled=true
https://raw.githubusercontent.com/acupMist/loon-rules/main/douyin.list, policy=抖音策略, tag=抖音, enabled=true
```

Mac 上 Gmail / Google / OpenAI / Grok 已经在订本仓库；加上 `claude.list`、`cursor.list` 后，本地 `[Rule]` 里对应的 DOMAIN 可以删掉。
