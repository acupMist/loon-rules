/**
 * 天府通（TFTAPP）去广告 — Loon http-response 改写
 *
 * 依据 2026-11-16 抓包（TFTAPP/9.6.0）。明文接口直接清空广告字段；
 * 首页布局 JSON 删除广告模块、福利推荐与底部“财富”菜单，保留乘车码 / 天府通卡 / 充值。
 * 加密接口无法改字段，统一回 200 + 空成功体，客户端按“无广告”处理。
 * 不拦截乘车码、支付、账户、地图。
 */

// 加密接口无法改字段。回 HTTP 204 时客户端会当失败并继续用缓存，
// 所以改回 200 + 空成功体（与明文接口同一套 status）。
// appAd/ 覆盖 tft-ams 下所有广告位方法；后面是弹窗、浮窗、乘车码页、财富页与优惠券角标。
const EMPTY_OK_MARKS = [
  "appAd/",
  "getOfficialAndBakAdvByPositionCode",
  "message/popup",
  "message/float/window",
  "affiliation/popup",
  "discountCard/getMergePopup",
  "getQrCodePageFunctionList",
  "getWealthPageFunctionList",
  "myCouponCountGateway",
  "discountAndCouponNum",
];

const HOME_DROP = {
  ad: true,
  activity: true,
  welfareContent: true,
  home_featured_products: true,
  home_subject_card_one: true,
  "co-BrandedCard": true,
};

const GRID_DROP_TITLES = {
  村糖购: true,
  出行头条: true,
  先学后付: true,
};

// 底部菜单删除项（navigationAll[].functionId），wealth 即“财富”
const NAV_DROP_FUNCTION_IDS = {
  wealth: true,
};

function pathOf(url) {
  const raw = String(url || "");
  const noQuery = raw.split("?")[0];
  const scheme = noQuery.indexOf("://");
  const start = scheme >= 0 ? noQuery.indexOf("/", scheme + 3) : 0;
  return start >= 0 ? noQuery.slice(start) : noQuery;
}

function bodyText() {
  if (typeof $response === "undefined" || !$response) return "";
  return $response.body || "";
}

function finish(body, status) {
  const headers = Object.assign({}, ($response && $response.headers) || {});
  delete headers["Content-Length"];
  delete headers["content-length"];
  delete headers["Content-Encoding"];
  delete headers["content-encoding"];
  $done({
    status: status || (($response && $response.status) || 200),
    headers: headers,
    body: body,
  });
}

function emptyOk() {
  finish(JSON.stringify({ data: null, message: "", status: "00000", success: true }));
}

function emptyList() {
  finish(JSON.stringify({ data: [], message: "", status: "00000" }));
}

function emptyMarketing() {
  finish(
    JSON.stringify({
      data: { pageTitle: "", contentList: [] },
      message: "",
      status: "00000",
    })
  );
}

function emptyDaily() {
  finish(JSON.stringify({ data: [], success: true, message: "success", status: "00000" }));
}

// smpex 财富资讯接口是另一套约定：status 为数字 0、message 固定“成功”
function emptySmpexNews() {
  finish(JSON.stringify({ data: [], message: "成功", status: 0 }));
}

function trimHome(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    finish(raw);
    return;
  }
  if (!Array.isArray(data)) {
    finish(raw);
    return;
  }
  data.forEach(function (block) {
    if (!block) return;
    if (Array.isArray(block.navigationAll)) {
      block.navigationAll = block.navigationAll.filter(function (nav) {
        return !nav || !NAV_DROP_FUNCTION_IDS[nav.functionId];
      });
    }
    if (!Array.isArray(block.content)) return;
    block.content = block.content.filter(function (mod) {
      if (!mod || !mod.modelType) return true;
      if (HOME_DROP[mod.modelType]) return false;
      if (mod.modelType === "mainFunction" && Array.isArray(mod.data)) {
        mod.data = mod.data.filter(function (item) {
          return !item || !GRID_DROP_TITLES[item.title];
        });
      }
      return true;
    });
  });
  finish(JSON.stringify(data));
}

function main() {
  const path = pathOf($request && $request.url);
  const raw = bodyText();

  if (EMPTY_OK_MARKS.some(function (p) { return path.indexOf(p) >= 0; })) {
    emptyOk();
    return;
  }
  if (path.indexOf("pageMarketing") >= 0) {
    emptyMarketing();
    return;
  }
  if (
    path.indexOf("getRedStarNewsByTypeId") >= 0 ||
    path.indexOf("getFinancialInformationType") >= 0
  ) {
    emptySmpexNews();
    return;
  }
  if (path.indexOf("activity/messages") >= 0) {
    emptyList();
    return;
  }
  if (path.indexOf("/wda/daily/") >= 0) {
    emptyDaily();
    return;
  }
  if (path.indexOf("/wda/calendar") >= 0) {
    finish(JSON.stringify({ data: [], success: true, message: "success", status: "00000" }));
    return;
  }
  if (/\/prod\/\d{8}\/\d+_\d+\.json$/.test(path)) {
    trimHome(raw);
    return;
  }
  finish(raw);
}

try {
  main();
} catch (e) {
  finish(bodyText());
}
