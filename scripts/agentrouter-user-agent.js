/**
 * AgentRouter · 模型请求 User-Agent 改写（仅 http-request）
 *
 * 插件 Argument：claudeUA、codexUA。留空时保留对应接口的原始 UA。
 * 改写头时必须原样回传正文。Loon Mac 在 requires-body=false 时会把
 * Content-Length 写成 0，上游即报 unexpected end of JSON input。
 * 不保存或打印 Cookie / Token / 正文。
 */

const LOG_TAG = "[agentrouter-ua]";
const DEFAULT_UA = {
  claudeUA: "claude-cli/2.1.197 (external, cli)",
  codexUA: "codex_cli_rs/0.170.0",
};

function headerValue(headers, name) {
  const want = name.toLowerCase();
  let found;
  Object.keys(headers || {}).forEach(function (key) {
    if (key.toLowerCase() === want) found = headers[key];
  });
  return found;
}

function deleteHeader(headers, name) {
  const want = name.toLowerCase();
  Object.keys(headers).forEach(function (key) {
    if (key.toLowerCase() === want) delete headers[key];
  });
}

function hasBody(body) {
  if (body == null) return false;
  if (typeof body === "string") return body.length > 0;
  if (typeof body.byteLength === "number") return body.byteLength > 0;
  if (typeof body.length === "number") return body.length > 0;
  return true;
}

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
  deleteHeader(headers, "user-agent");
  headers["User-Agent"] = userAgent;

  const body = $request.body;
  if (hasBody(body) && String(headerValue(headers, "content-length") || "") === "0") {
    deleteHeader(headers, "content-length");
  }

  const result = { headers: headers };
  if (typeof body !== "undefined") result.body = body;
  return result;
}

let result = {};
try {
  result = rewriteRequest();
} catch (e) {
  console.log(LOG_TAG + " 改写失败，原请求继续");
}
$done(result);
