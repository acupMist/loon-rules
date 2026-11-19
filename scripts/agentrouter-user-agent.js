/**
 * AgentRouter · 模型请求 User-Agent 改写（仅 http-request）
 *
 * 插件 Argument：claudeUA、codexUA。留空时保留对应接口的原始 UA。
 * 只返回 headers，不读取正文，不保存或打印 Cookie / Token。
 */

const LOG_TAG = "[agentrouter-ua]";
const DEFAULT_UA = {
  claudeUA: "claude-cli/2.1.197 (external, cli)",
  codexUA: "codex_cli_rs/0.170.0",
};

function rewriteRequest() {
  if (typeof $request === "undefined" || !$request) return {};

  const match = /^https:\/\/(?:www\.)?agentrouter\.org(?::443)?(\/v1\/[^?#]*)(?:\?[^#]*)?$/.exec($request.url || "");
  if (!match || /^(OPTIONS|CONNECT)$/i.test($request.method || "")) return {};

  const key = /^\/v1\/messages(?:\/|$)/.test(match[1]) ? "claudeUA" : "codexUA";
  let args = typeof $argument === "undefined" ? {} : $argument;
  if (typeof args === "string") {
    try {
      args = JSON.parse(args);
    } catch (e) {
      console.log(LOG_TAG + " 参数格式无效，保留原始 UA");
      return {};
    }
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) return {};

  const value = Object.prototype.hasOwnProperty.call(args, key) ? args[key] : DEFAULT_UA[key];
  if (typeof value !== "string") return {};
  // 检查原始值，拒绝换行与控制字符，避免把参数变成额外的请求头。
  if (/[^\x20-\x7e]/.test(value)) {
    console.log(LOG_TAG + " UA 必须是单行 ASCII 文本，保留原始 UA");
    return {};
  }
  const userAgent = value.trim();
  if (!userAgent) return {};

  const headers = Object.assign({}, $request.headers || {});
  Object.keys(headers).forEach(function (name) {
    if (name.toLowerCase() === "user-agent") delete headers[name];
  });
  headers["User-Agent"] = userAgent;
  return { headers: headers };
}

let result = {};
try {
  result = rewriteRequest();
} catch (e) {
  console.log(LOG_TAG + " 改写失败，原请求继续");
}
$done(result);
