/**
 * 原神 · Cookie 捕获（仅 http-request）
 *
 * 插件 Argument：capture（true/false）。关闭后立即 $done({})，不保存。
 * 成功条件：请求 Cookie 含 cookie_token。
 * 切勿把真实 Cookie/Token 写进本文件。
 */

const KEY = {
  cookie: "genshin_cookie",
  stoken: "genshin_stoken",
  mid: "genshin_mid",
  stuid: "genshin_stuid",
  deviceId: "genshin_device_id",
  deviceFp: "genshin_device_fp",
};

function parseArgFlag(arg, key, defaultTrue) {
  if (arg == null || arg === "") return !!defaultTrue;
  var s = String(arg).trim();
  var v = null;
  if (/^\{[\s\S]*\}$/.test(s)) {
    try {
      var j = JSON.parse(s);
      if (j && typeof j === "object" && key in j) v = j[key];
    } catch (e) {}
  }
  if (v == null && s.indexOf("=") >= 0) {
    s.split(/[,&]/).forEach(function (p) {
      var i = p.indexOf("=");
      if (i < 0) return;
      var k = p.slice(0, i).trim().replace(/^\[|\]$/g, "");
      var val = p.slice(i + 1).trim();
      if (k === key) v = val;
    });
  }
  if (v == null) v = s;
  var t = String(v).trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (t === "" || t === "true" || t === "1" || t === "on" || t === "yes" || t === "开启") return true;
  if (t === "false" || t === "0" || t === "off" || t === "no" || t === "关闭") return false;
  return !!defaultTrue;
}

function notify(title, subtitle, body) {
  var t = title || "";
  var sub = subtitle || "";
  var b = body || "";
  try {
    if (typeof $notification !== "undefined" && $notification && typeof $notification.post === "function") {
      $notification.post(t, sub, b);
      return;
    }
  } catch (e) {}
  try {
    if (typeof $notify === "function") {
      $notify(t, sub, b);
      return;
    }
  } catch (e) {}
  try {
    if (typeof $notification === "function") {
      $notification(t, sub, b);
    }
  } catch (e) {}
}

function save(k, v) {
  try { $persistentStore.write(String(v == null ? "" : v), k); } catch (e) {}
}

function parseCookie(str) {
  var m = {};
  String(str || "").split(";").forEach(function (p) {
    var i = p.indexOf("=");
    if (i < 0) return;
    var k = p.slice(0, i).trim();
    var v = p.slice(i + 1).trim();
    if (k) m[k] = v;
  });
  return m;
}

function cookiePick(map, names) {
  for (var i = 0; i < names.length; i++) if (map[names[i]]) return map[names[i]];
  return "";
}

function headerGet(headers, name) {
  if (!headers) return "";
  var want = String(name).toLowerCase();
  if (headers[name] != null) return String(headers[name]);
  if (headers[want] != null) return String(headers[want]);
  var keys = Object.keys(headers);
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i]).toLowerCase() === want) return String(headers[keys[i]]);
  }
  return "";
}

var CAPTURE_ENABLED = parseArgFlag(
  typeof $argument !== "undefined" ? $argument : "",
  "capture",
  true
);

if (!CAPTURE_ENABLED) {
  $done({});
} else {
  try {
    var raw = (typeof $request !== "undefined" && $request && $request.headers) ? $request.headers : {};
    var cookie = headerGet(raw, "Cookie") || headerGet(raw, "cookie");
    var deviceId = headerGet(raw, "x-rpc-device_id");
    var deviceFp = headerGet(raw, "x-rpc-device_fp");

    if (deviceId) save(KEY.deviceId, deviceId);
    if (deviceFp) save(KEY.deviceFp, deviceFp);

    if (!cookie) {
      notify("原神Cookie捕获", "失败", "请求中没有 Cookie 头");
      $done({});
    } else if (!/cookie_token/i.test(cookie)) {
      notify("原神Cookie捕获", "失败", "Cookie 中无 cookie_token，请打开米游社原神签到页再试");
      $done({});
    } else {
      save(KEY.cookie, cookie);
      var map = parseCookie(cookie);
      var mid = cookiePick(map, ["account_mid_v2", "ltmid_v2", "mid"]);
      var stuid = cookiePick(map, ["account_id_v2", "account_id", "ltuid_v2", "ltuid", "stuid"]);
      if (mid) save(KEY.mid, mid);
      if (stuid) save(KEY.stuid, stuid);
      if (map.stoken) save(KEY.stoken, map.stoken);
      notify("原神Cookie捕获", "成功", "已保存 Cookie（请到插件参数关闭「启用捕获」）");
      $done({});
    }
  } catch (e) {
    notify("原神Cookie捕获", "异常", String(e && e.message ? e.message : e));
    $done({});
  }
}
