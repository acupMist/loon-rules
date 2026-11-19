const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts/agentrouter-user-agent.js"), "utf8");
const plugin = fs.readFileSync(path.join(root, "plugins/agentrouter-user-agent.plugin"), "utf8");
const defaults = {
  claudeUA: "claude-cli/2.1.197 (external, cli)",
  codexUA: "codex_cli_rs/0.170.0",
};

function run(url, options = {}) {
  const originalHeaders = {
    Authorization: "Bearer test-only",
    "x-api-key": "test-only",
    Cookie: "test-only",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
    "anthropic-version": "2023-06-01",
    "user-agent": "Original/1.0",
    ...options.headers,
  };
  const beforeHeaders = { ...originalHeaders };
  const calls = [];
  const logs = [];
  const request = { url, method: options.method || "POST", headers: originalHeaders };
  if (Object.prototype.hasOwnProperty.call(options, "body")) request.body = options.body;
  const context = {
    $request: request,
    $done(result) { calls.push(result); },
    console: { log(message) { logs.push(message); } },
  };
  if (Object.prototype.hasOwnProperty.call(options, "args")) context.$argument = options.args;
  vm.runInNewContext(source, context, { timeout: 1000 });
  assert.equal(calls.length, 1, "$done must be called exactly once");
  assert.deepEqual(beforeHeaders, request.headers, "Do not mutate input headers");
  assert.equal(logs.join(" ").includes("test-only"), false, "No credential logging");
  const result = JSON.parse(JSON.stringify(calls[0]));
  if (result.headers) {
    for (const [name, value] of Object.entries(originalHeaders)) {
      if (name.toLowerCase() === "user-agent") continue;
      if (name.toLowerCase() === "content-length") {
        if (Object.prototype.hasOwnProperty.call(options, "body") && options.body) {
          assert.equal(result.headers["Content-Length"], String(options.body.length));
          continue;
        }
        if (String(value) === "0") {
          assert.equal(Object.keys(result.headers).some((k) => k.toLowerCase() === "content-length"), false);
          continue;
        }
      }
      assert.equal(result.headers[name], value);
    }
    assert.equal(originalHeaders["user-agent"], beforeHeaders["user-agent"]);
    assert.deepEqual(Object.keys(result.headers).filter(name => name.toLowerCase() === "user-agent"), ["User-Agent"]);
  }
  return result;
}

for (const endpoint of ["messages", "messages?beta=true", "messages/count_tokens", "messages/batches/id"]) {
  test("Claude UA: " + endpoint, () => {
    assert.equal(run("https://agentrouter.org/v1/" + endpoint).headers["User-Agent"], defaults.claudeUA);
  });
}

for (const endpoint of ["responses", "responses/id", "responses/compact", "chat/completions", "completions", "models", "models/gpt-test", "embeddings", "rerank", "images/generations", "audio/transcriptions", "messages-other"]) {
  test("Codex UA: " + endpoint, () => {
    assert.equal(run("https://www.agentrouter.org/v1/" + endpoint).headers["User-Agent"], defaults.codexUA);
  });
}

test("Use explicit port 443", () => {
  assert.equal(run("https://agentrouter.org:443/v1/responses").headers["User-Agent"], defaults.codexUA);
});

test("All five client UAs are replaced by endpoint", () => {
  for (const client of ["ZCode", "OpenCode", "Pi", "Claude Code", "Codex"]) {
    for (const [endpoint, key] of [["messages", "claudeUA"], ["responses", "codexUA"]]) {
      assert.equal(run("https://agentrouter.org/v1/" + endpoint, { headers: { "user-agent": client } }).headers["User-Agent"], defaults[key]);
    }
  }
});

test("Remove duplicate UA casing and preserve every other header", () => {
  const result = run("https://agentrouter.org/v1/messages", {
    headers: { "User-Agent": "Duplicate/1", "USER-AGENT": "Duplicate/2" },
  });
  assert.equal(result.headers["User-Agent"], defaults.claudeUA);
});

test("Custom UA object including commas", () => {
  const args = { claudeUA: "Custom/2 (external, cli)", codexUA: "CustomCodex/2" };
  assert.equal(run("https://agentrouter.org/v1/messages", { args }).headers["User-Agent"], args.claudeUA);
  assert.equal(run("https://agentrouter.org/v1/responses", { args }).headers["User-Agent"], args.codexUA);
});

test("JSON serialized arguments", () => {
  assert.equal(run("https://agentrouter.org/v1/messages", { args: '{"claudeUA":"Custom/3"}' }).headers["User-Agent"], "Custom/3");
});

for (const value of ["", "   ", "\r\nInjected: yes", "Custom/1\n", "Custom\t1", "Custom\0", "Custom\x7f", "中文", null, 123, false]) {
  test("Invalid or empty UA passes through: " + JSON.stringify(value), () => {
    assert.deepEqual(run("https://agentrouter.org/v1/messages", { args: { claudeUA: value } }), {});
  });
}

test("Empty Claude UA does not disable Codex UA", () => {
  assert.equal(run("https://agentrouter.org/v1/responses", { args: { claudeUA: "" } }).headers["User-Agent"], defaults.codexUA);
});

for (const args of ["not json", "claudeUA=unsupported", null, [], "[]", "null"]) {
  test("Invalid arguments pass through: " + JSON.stringify(args), () => {
    assert.deepEqual(run("https://agentrouter.org/v1/messages", { args }), {});
  });
}

for (const url of [
  "https://agentrouter.org/", "https://agentrouter.org/api/user/self",
  "https://agentrouter.org/docs/index.html", "https://agentrouter.org/login",
  "https://agentrouter.org/v1beta/models/gemini:generateContent", "https://api.anthropic.com/v1/messages",
  "https://api.openai.com/v1/responses", "https://ps.air-outer.com/v1/messages",
  "https://evilagentrouter.org/v1/messages", "https://agentrouter.org.evil.test/v1/messages",
  "https://agentrouter.org@evil.test/v1/messages", "https://other.agentrouter.org/v1/messages",
  "https://agentrouter.org:8443/v1/messages", "http://agentrouter.org/v1/messages",
  "wss://agentrouter.org/v1/responses", "https://agentrouter.org/v11/messages",
]) {
  test("Out of scope: " + url, () => assert.deepEqual(run(url), {}));
}

for (const method of ["OPTIONS", "CONNECT"]) {
  test("Skip " + method, () => assert.deepEqual(run("https://agentrouter.org/v1/messages", { method }), {}));
}

test("DSH Responses keeps JSON body and original Content-Length", () => {
  const body = '{"model":"gpt-6.1-sol","input":"hello"}';
  const result = run("https://agentrouter.org/v1/responses", {
    headers: {
      "user-agent": "deepseek-harness/0.2.2-rc.5 (+https://github.com/deepseek-ai/deepseek-harness) dsh-profile/desktop",
      "content-length": String(body.length),
    },
    body,
  });
  assert.equal(result.headers["User-Agent"], defaults.codexUA);
  assert.equal(result.headers["Content-Length"], String(body.length));
  assert.equal(result.body, body);
});

test("Drop Loon-injected Content-Length 0 when body is present", () => {
  const body = '{"model":"gpt-6.1-sol","input":"hello"}';
  const result = run("https://agentrouter.org/v1/responses", {
    headers: {
      "user-agent": "deepseek-harness/0.2.2-rc.5 (+https://github.com/deepseek-ai/deepseek-harness) dsh-profile/desktop",
      "content-length": "0",
    },
    body,
  });
  assert.equal(result.headers["User-Agent"], defaults.codexUA);
  assert.equal(result.body, body);
  assert.equal(result.headers["Content-Length"], String(body.length));
});

test("Already correct UA is left unchanged", () => {
  assert.deepEqual(run("https://agentrouter.org/v1/responses", {
    headers: { "user-agent": defaults.codexUA, "content-length": "12" },
    body: '{"ok":true}',
  }), {});
});

test("Plugin captures body on chat paths and skips body on listing paths", () => {
  const rules = plugin.split("\n").filter(line => line.startsWith("http-request "));
  assert.equal(rules.length, 2);
  const bodyRule = rules.find(line => /requires-body=true/.test(line));
  const listRule = rules.find(line => /requires-body=false/.test(line));
  assert.ok(bodyRule && listRule);
  const bodyRegex = new RegExp(bodyRule.split(" ")[1]);
  const listRegex = new RegExp(listRule.split(" ")[1]);
  assert.match(bodyRule, /argument=\[\{claudeUA\},\{codexUA\}\]/);
  assert.match(plugin, /hostname = agentrouter\.org, www\.agentrouter\.org\n/);
  for (const [key, value] of Object.entries(defaults)) {
    assert.ok(plugin.includes(key + '=input, "' + value + '"'));
  }
  assert.ok(bodyRegex.test("https://agentrouter.org/v1/messages?beta=true"));
  assert.ok(bodyRegex.test("https://agentrouter.org/v1/messages/count_tokens"));
  assert.ok(bodyRegex.test("https://www.agentrouter.org:443/v1/responses"));
  assert.ok(bodyRegex.test("https://agentrouter.org/v1/chat/completions"));
  assert.equal(bodyRegex.test("https://agentrouter.org/v1/models"), false);
  assert.equal(bodyRegex.test("https://agentrouter.org/v1/messages-other"), false);
  assert.ok(listRegex.test("https://agentrouter.org/v1/models"));
  assert.ok(listRegex.test("https://agentrouter.org/v1/messages-other"));
  assert.equal(listRegex.test("https://agentrouter.org/v1/responses"), false);
  assert.equal(listRegex.test("https://agentrouter.org/v1/messages?beta=true"), false);
  assert.equal(bodyRegex.test("https://agentrouter.org/api/user/self"), false);
  assert.equal(bodyRegex.test("https://agentrouter.org.evil.test/v1/messages"), false);
  assert.equal(bodyRegex.test("https://agentrouter.org/v1beta/models"), false);
});
