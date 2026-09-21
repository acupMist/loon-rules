/**
 * 原神 · 米游社每日签到（国服 luna/hk4e）— Loon 签到脚本（仅 cron / 手动）
 *
 * 抓包还原：
 *   POST https://api-takumi.mihoyo.com/event/luna/hk4e/sign
 *   Body: { act_id, region, uid, lang }
 *   Headers: Cookie, DS, x-rpc-client_type=5, x-rpc-signgame=hk4e, …
 *
 * 可选 Token 刷新（抓包中存在）：
 *   POST https://passport-api.mihoyo.com/account/ma-cn-session/app/verify
 *   POST https://passport-api.mihoyo.com/account/ma-cn-session/app/exchange  (token_type 1→4)
 *
 * $persistentStore：
 *   genshin_cookie  (必填) 完整 Cookie
 *   genshin_stoken  (可选) v2 stoken，用于自动刷新 cookie_token
 *   genshin_mid     (可选) mid
 *   genshin_stuid   (可选) 账号 id
 *   genshin_uid / genshin_region / genshin_device_id / genshin_device_fp
 *
 * 切勿把真实 Cookie/Token 写进本文件。
 */

const ACT_ID = "e202311201442471";
const SIGN_BASE = "https://api-takumi.mihoyo.com";
const PASSPORT_BASE = "https://passport-api.mihoyo.com";

// DS salt 须与 APP_VERSION 配对。抓包 App=2.115.0（盐在原生 getDS）。
// 使用社区已知可用的 2.109.0 配对；若 DS 失败请按 README 更新。
const APP_VERSION = "2.109.0";
const SALT_WEB = "d9200c846b10886e8c874fc33c8f308b"; // client_type 5 // client_type 5
const SALT_APP = "47f15f1b66bee46b816115d8e8e6ebb6"; // client_type 1 // client_type 1
const CLIENT_WEB = "5";
const CLIENT_APP = "1";
const APP_ID = "bll8iq97cem8";

const KEY = {
  cookie: "genshin_cookie",
  stoken: "genshin_stoken",
  mid: "genshin_mid",
  stuid: "genshin_stuid",
  uid: "genshin_uid",
  region: "genshin_region",
  deviceId: "genshin_device_id",
  deviceFp: "genshin_device_fp",
};

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/" +
  APP_VERSION;

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

var NOTIFY_ENABLED = parseArgFlag(
  typeof $argument !== "undefined" ? $argument : "",
  "notify",
  true
);

function notify(title, subtitle, body) {
  if (!NOTIFY_ENABLED) return;
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
function load(k) {
  try { return $persistentStore.read(k) || ""; } catch (e) { return ""; }
}
function save(k, v) {
  try { $persistentStore.write(String(v == null ? "" : v), k); } catch (e) {}
}

function md5(str) {
  if (typeof $utils !== "undefined" && $utils.md5) return $utils.md5(str);
  if (typeof CryptoJS !== "undefined" && CryptoJS.MD5) return CryptoJS.MD5(str).toString();
  return md5Pure(str);
}

// Minimal MD5, verified against Node crypto
function md5Pure(input) {
  function cmn(q, a, b, x, s, t) {
    a = (a + q + (x | 0) + (t | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function toUtf8(str) {
    var utf = "", i = -1, c;
    while (++i < str.length) {
      c = str.charCodeAt(i);
      if (c < 0x80) utf += String.fromCharCode(c);
      else if (c < 0x800) {
        utf += String.fromCharCode(0xc0 | (c >> 6));
        utf += String.fromCharCode(0x80 | (c & 0x3f));
      } else if (c < 0xd800 || c >= 0xe000) {
        utf += String.fromCharCode(0xe0 | (c >> 12));
        utf += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
        utf += String.fromCharCode(0x80 | (c & 0x3f));
      } else {
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf += String.fromCharCode(0xf0 | (c >> 18));
        utf += String.fromCharCode(0x80 | ((c >> 12) & 0x3f));
        utf += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
        utf += String.fromCharCode(0x80 | (c & 0x3f));
      }
    }
    return utf;
  }

  function bytesToWords(bytes) {
    var words = [], bl = bytes.length, i;
    for (i = 0; i < bl; i++) words[i >> 2] |= bytes.charCodeAt(i) << ((i % 4) * 8);
    return words;
  }
  function wordsToBytes(words) {
    var bytes = "", i, bl = words.length * 4;
    for (i = 0; i < bl; i++) bytes += String.fromCharCode((words[i >> 2] >> ((i % 4) * 8)) & 0xff);
    return bytes;
  }
  function bytesToHex(bytes) {
    var hex = "", i, b;
    for (i = 0; i < bytes.length; i++) {
      b = bytes.charCodeAt(i);
      hex += ((b >> 4) & 0xf).toString(16) + (b & 0xf).toString(16);
    }
    return hex;
  }

  var msg = toUtf8(String(input));
  var m = bytesToWords(msg);
  var l = msg.length * 8;
  m[l >> 5] |= 0x80 << (l % 32);
  m[(((l + 64) >>> 9) << 4) + 14] = l;

  var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (var i = 0; i < m.length; i += 16) {
    var aa = a, bb = b, cc = c, dd = d;
    a = ff(a, b, c, d, m[i+0], 7, -680876936); d = ff(d, a, b, c, m[i+1], 12, -389564586);
    c = ff(c, d, a, b, m[i+2], 17, 606105819); b = ff(b, c, d, a, m[i+3], 22, -1044525330);
    a = ff(a, b, c, d, m[i+4], 7, -176418897); d = ff(d, a, b, c, m[i+5], 12, 1200080426);
    c = ff(c, d, a, b, m[i+6], 17, -1473231341); b = ff(b, c, d, a, m[i+7], 22, -45705983);
    a = ff(a, b, c, d, m[i+8], 7, 1770035416); d = ff(d, a, b, c, m[i+9], 12, -1958414417);
    c = ff(c, d, a, b, m[i+10], 17, -42063); b = ff(b, c, d, a, m[i+11], 22, -1990404162);
    a = ff(a, b, c, d, m[i+12], 7, 1804603682); d = ff(d, a, b, c, m[i+13], 12, -40341101);
    c = ff(c, d, a, b, m[i+14], 17, -1502002290); b = ff(b, c, d, a, m[i+15], 22, 1236535329);
    a = gg(a, b, c, d, m[i+1], 5, -165796510); d = gg(d, a, b, c, m[i+6], 9, -1069501632);
    c = gg(c, d, a, b, m[i+11], 14, 643717713); b = gg(b, c, d, a, m[i+0], 20, -373897302);
    a = gg(a, b, c, d, m[i+5], 5, -701558691); d = gg(d, a, b, c, m[i+10], 9, 38016083);
    c = gg(c, d, a, b, m[i+15], 14, -660478335); b = gg(b, c, d, a, m[i+4], 20, -405537848);
    a = gg(a, b, c, d, m[i+9], 5, 568446438); d = gg(d, a, b, c, m[i+14], 9, -1019803690);
    c = gg(c, d, a, b, m[i+3], 14, -187363961); b = gg(b, c, d, a, m[i+8], 20, 1163531501);
    a = gg(a, b, c, d, m[i+13], 5, -1444681467); d = gg(d, a, b, c, m[i+2], 9, -51403784);
    c = gg(c, d, a, b, m[i+7], 14, 1735328473); b = gg(b, c, d, a, m[i+12], 20, -1926607734);
    a = hh(a, b, c, d, m[i+5], 4, -378558); d = hh(d, a, b, c, m[i+8], 11, -2022574463);
    c = hh(c, d, a, b, m[i+11], 16, 1839030562); b = hh(b, c, d, a, m[i+14], 23, -35309556);
    a = hh(a, b, c, d, m[i+1], 4, -1530992060); d = hh(d, a, b, c, m[i+4], 11, 1272893353);
    c = hh(c, d, a, b, m[i+7], 16, -155497632); b = hh(b, c, d, a, m[i+10], 23, -1094730640);
    a = hh(a, b, c, d, m[i+13], 4, 681279174); d = hh(d, a, b, c, m[i+0], 11, -358537222);
    c = hh(c, d, a, b, m[i+3], 16, -722521979); b = hh(b, c, d, a, m[i+6], 23, 76029189);
    a = hh(a, b, c, d, m[i+9], 4, -640364487); d = hh(d, a, b, c, m[i+12], 11, -421815835);
    c = hh(c, d, a, b, m[i+15], 16, 530742520); b = hh(b, c, d, a, m[i+2], 23, -995338651);
    a = ii(a, b, c, d, m[i+0], 6, -198630844); d = ii(d, a, b, c, m[i+7], 10, 1126891415);
    c = ii(c, d, a, b, m[i+14], 15, -1416354905); b = ii(b, c, d, a, m[i+5], 21, -57434055);
    a = ii(a, b, c, d, m[i+12], 6, 1700485571); d = ii(d, a, b, c, m[i+3], 10, -1894986606);
    c = ii(c, d, a, b, m[i+10], 15, -1051523); b = ii(b, c, d, a, m[i+1], 21, -2054922799);
    a = ii(a, b, c, d, m[i+8], 6, 1873313359); d = ii(d, a, b, c, m[i+15], 10, -30611744);
    c = ii(c, d, a, b, m[i+6], 15, -1560198380); b = ii(b, c, d, a, m[i+13], 21, 1309151649);
    a = ii(a, b, c, d, m[i+4], 6, -145523070); d = ii(d, a, b, c, m[i+11], 10, -1120210379);
    c = ii(c, d, a, b, m[i+2], 15, 718787259); b = ii(b, c, d, a, m[i+9], 21, -343485551);
    a = (a + aa) | 0; b = (b + bb) | 0; c = (c + cc) | 0; d = (d + dd) | 0;
  }
  return bytesToHex(wordsToBytes([a, b, c, d]));
}

function randStr(n) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var s = "";
  for (var i = 0; i < n; i++) s += chars.charAt((Math.random() * chars.length) | 0);
  return s;
}
function uuid() {
  var h = "0123456789abcdef", s = "";
  for (var i = 0; i < 32; i++) s += h.charAt((Math.random() * 16) | 0);
  return s.slice(0, 8) + "-" + s.slice(8, 12) + "-" + s.slice(12, 16) + "-" + s.slice(16, 20) + "-" + s.slice(20);
}
function makeDS(salt) {
  var t = String((Date.now() / 1000) | 0);
  var r = randStr(6);
  return t + "," + r + "," + md5("salt=" + salt + "&t=" + t + "&r=" + r);
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
function cookieUpsert(str, kv) {
  var m = parseCookie(str);
  Object.keys(kv).forEach(function (k) {
    if (kv[k] != null && kv[k] !== "") m[k] = kv[k];
  });
  return Object.keys(m).map(function (k) { return k + "=" + m[k]; }).join("; ");
}

function httpReq(opt) {
  return new Promise(function (resolve, reject) {
    var method = (opt.method || "GET").toUpperCase();
    var cb = function (err, resp, body) {
      if (err) reject(err);
      else resolve({ resp: resp, body: body, status: resp && resp.status });
    };
    if (method === "POST") $httpClient.post(opt, cb);
    else $httpClient.get(opt, cb);
  });
}

function ensureDevice() {
  var id = load(KEY.deviceId);
  if (!id) { id = uuid(); save(KEY.deviceId, id); }
  var fp = load(KEY.deviceFp);
  if (!fp) { fp = randStr(13); save(KEY.deviceFp, fp); }
  return { id: id, fp: fp };
}

function headersSign(cookie, device) {
  return {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=utf-8",
    Origin: "https://act.mihoyo.com",
    Referer: "https://act.mihoyo.com/",
    "User-Agent": UA,
    Cookie: cookie,
    DS: makeDS(SALT_WEB),
    "x-rpc-app_version": APP_VERSION,
    "x-rpc-client_type": CLIENT_WEB,
    "x-rpc-device_id": device.id,
    "x-rpc-device_fp": device.fp,
    "x-rpc-device_model": "iPhone",
    "x-rpc-device_name": "iPhone",
    "x-rpc-platform": "1",
    "x-rpc-signgame": "hk4e",
  };
}

function headersPassport(cookie, device) {
  return {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=utf-8",
    "User-Agent": UA,
    Cookie: cookie,
    DS: makeDS(SALT_APP),
    "x-rpc-app_version": APP_VERSION,
    "x-rpc-client_type": CLIENT_APP,
    "x-rpc-device_id": device.id,
    "x-rpc-device_fp": device.fp,
    "x-rpc-device_model": "iPhone",
    "x-rpc-device_name": "iPhone",
    "x-rpc-sys_version": "16.6",
    "x-rpc-sdk_version": "2.51.0",
    "x-rpc-game_biz": "bbs_cn",
    "x-rpc-app_id": APP_ID,
    "x-rpc-account_version": "2.51.0",
  };
}

async function fetchRoles(cookie, device) {
  var url = PASSPORT_BASE + "/binding/api/getUserGameRolesByCookieToken?game_biz=hk4e_cn";
  var r = await httpReq({
    url: url,
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: cookie,
      "User-Agent": UA,
      Referer: "https://act.mihoyo.com/",
      Origin: "https://act.mihoyo.com",
      "x-rpc-app_version": APP_VERSION,
      "x-rpc-client_type": CLIENT_WEB,
      "x-rpc-device_id": device.id,
    },
  });
  var j = JSON.parse(r.body);
  if (j.retcode !== 0) throw new Error("获取角色失败: " + (j.message || r.body));
  var list = (j.data && j.data.list) || [];
  if (!list.length) throw new Error("未绑定原神角色");
  var role =
    list.find(function (x) { return x.region === "cn_gf01"; }) ||
    list.find(function (x) { return x.is_chosen; }) ||
    list[0];
  return { uid: String(role.game_uid), region: role.region, nickname: role.nickname || "" };
}

async function fetchInfo(cookie, device, uid, region) {
  var url =
    SIGN_BASE +
    "/event/luna/hk4e/info?lang=zh-cn&act_id=" +
    ACT_ID +
    "&region=" +
    encodeURIComponent(region) +
    "&uid=" +
    encodeURIComponent(uid);
  var r = await httpReq({
    url: url,
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: cookie,
      Origin: "https://act.mihoyo.com",
      Referer: "https://act.mihoyo.com/",
      "User-Agent": UA,
      "x-rpc-signgame": "hk4e",
    },
  });
  return JSON.parse(r.body);
}

async function postSign(cookie, device, uid, region) {
  var r = await httpReq({
    url: SIGN_BASE + "/event/luna/hk4e/sign",
    method: "POST",
    headers: headersSign(cookie, device),
    body: JSON.stringify({
      act_id: ACT_ID,
      region: region,
      uid: String(uid),
      lang: "zh-cn",
    }),
  });
  return JSON.parse(r.body);
}

async function refreshTokens(cfg, device) {
  if (!cfg.stoken || !cfg.mid) return { ok: false, reason: "缺少 stoken 或 mid，无法自动刷新" };
  var stuid = cfg.stuid || "";
  var stoken = cfg.stoken;
  try {
    var vr = await httpReq({
      url: PASSPORT_BASE + "/account/ma-cn-session/app/verify",
      method: "POST",
      headers: headersPassport("stuid=" + stuid + ";stoken=" + stoken + ";mid=" + cfg.mid, device),
      body: JSON.stringify({
        mid: cfg.mid,
        refresh: true,
        token: { token_type: 1, token: stoken },
      }),
    });
    var vj = JSON.parse(vr.body);
    if (vj.retcode === 0 && vj.data && vj.data.new_token && vj.data.new_token.token) {
      stoken = vj.data.new_token.token;
      save(KEY.stoken, stoken);
      cfg.stoken = stoken;
    }
  } catch (e) {}

  var er = await httpReq({
    url: PASSPORT_BASE + "/account/ma-cn-session/app/exchange",
    method: "POST",
    headers: headersPassport("stuid=" + stuid + ";stoken=" + stoken + ";mid=" + cfg.mid, device),
    body: JSON.stringify({
      mid: cfg.mid,
      src_token: { token_type: 1, token: stoken },
      dst_token_type: 4,
    }),
  });
  var ej = JSON.parse(er.body);
  if (ej.retcode !== 0 || !ej.data || !ej.data.token || !ej.data.token.token) {
    return { ok: false, reason: "exchange 失败: " + (ej.message || er.body) };
  }
  var ct = ej.data.token.token;
  cfg.cookie = cookieUpsert(cfg.cookie, {
    cookie_token: ct,
    cookie_token_v2: ct,
    account_id: stuid,
    account_id_v2: stuid,
    account_mid_v2: cfg.mid,
  });
  save(KEY.cookie, cfg.cookie);
  return { ok: true };
}

function isAuthErr(code, msg) {
  msg = String(msg || "");
  return code === -100 || code === -10001 || /登录|login|cookie|尚未登录|失效|unauthorized/i.test(msg);
}
function isSignedAlready(code, msg) {
  return code === -5003 || /已签到|already/i.test(String(msg || ""));
}


async function main() {
  var cookie = load(KEY.cookie);
  if (!cookie) {
    notify("原神签到", "未配置 Cookie", "请先用「原神Cookie捕获」插件保存 Cookie，或手动写入 genshin_cookie。");
    return;
  }

  var device = ensureDevice();
  var map = parseCookie(cookie);
  var cfg = {
    cookie: cookie,
    stoken: load(KEY.stoken) || map.stoken || "",
    mid: load(KEY.mid) || cookiePick(map, ["account_mid_v2", "ltmid_v2", "mid"]),
    stuid:
      load(KEY.stuid) ||
      cookiePick(map, ["account_id_v2", "account_id", "ltuid_v2", "ltuid", "stuid"]),
    uid: load(KEY.uid),
    region: load(KEY.region),
  };
  if (cfg.mid) save(KEY.mid, cfg.mid);
  if (cfg.stuid) save(KEY.stuid, cfg.stuid);

  try {
    if (!cfg.uid || !cfg.region) {
      var role = await fetchRoles(cfg.cookie, device);
      cfg.uid = role.uid;
      cfg.region = role.region;
      save(KEY.uid, cfg.uid);
      save(KEY.region, cfg.region);
    }

    var info = await fetchInfo(cfg.cookie, device, cfg.uid, cfg.region);
    if (isAuthErr(info.retcode, info.message) && cfg.stoken) {
      var ref = await refreshTokens(cfg, device);
      if (!ref.ok) {
        notify("原神签到", "登录失效", ref.reason || info.message);
        return;
      }
      info = await fetchInfo(cfg.cookie, device, cfg.uid, cfg.region);
    }
    if (info.retcode !== 0) {
      notify("原神签到", "查询失败", info.retcode + ": " + info.message);
      return;
    }
    if (info.data && info.data.is_sign) {
      notify("原神签到", "今日已签到", "累计 " + info.data.total_sign_day + " 天 · UID " + cfg.uid);
      return;
    }

    var result = await postSign(cfg.cookie, device, cfg.uid, cfg.region);
    if (isAuthErr(result.retcode, result.message) && cfg.stoken) {
      var ref2 = await refreshTokens(cfg, device);
      if (ref2.ok) result = await postSign(cfg.cookie, device, cfg.uid, cfg.region);
    }

    if (isSignedAlready(result.retcode, result.message)) {
      notify("原神签到", "今日已签到", "UID " + cfg.uid);
      return;
    }

    if (result.retcode === 0) {
      var risk =
        result.data &&
        (result.data.is_risk || result.data.risk_code || result.data.success === 1);
      if (risk) {
        notify("原神签到", "触发验证码", "请打开米游社手动签到一次");
        return;
      }
      var days = "";
      try {
        var info2 = await fetchInfo(cfg.cookie, device, cfg.uid, cfg.region);
        if (info2.retcode === 0 && info2.data) days = "累计 " + info2.data.total_sign_day + " 天 · ";
      } catch (e) {}
      notify("原神签到", "签到成功", days + "UID " + cfg.uid);
      return;
    }

    notify("原神签到", "签到失败", result.retcode + ": " + (result.message || JSON.stringify(result)));
  } catch (e) {
    notify("原神签到", "脚本异常", String(e && e.message ? e.message : e));
  }
}


// Keep script alive until async finishes so Loon does not exit before notify; $done once
Promise.resolve()
  .then(function () { return main(); })
  .catch(function (e) {
    notify("原神签到", "脚本异常", String(e && e.message ? e.message : e));
  })
  .then(function () { $done(); }, function () { $done(); });
