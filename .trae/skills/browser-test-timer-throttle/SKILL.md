---
name: "browser-test-timer-throttle"
description: "Diagnose/fix in-page browser test hangs from timer throttling in unfocused windows or hidden iframes. Invoke when automated tests stall (~1 step/min) or setTimeout waits never resolve."
---

# 浏览器自动化测试中定时器节流的排查与修复

本工作区（d:\appppppppppp，单文件 HTML 应用 + tests/runner.html）实测沉淀。

## 触发场景（出现任一即适用）

- 浏览器自动化（MCP browser_* / CDP）驱动的页面内测试套件「假死」：通过数停住，约每分钟才推进一步，8 秒后无变化。
- 被卡测试固定在依赖 `setTimeout` 等待（弹窗提交、文件导入、IDB 回调）的用例上；手动在真实可见窗口按同样序列操作却正常。
- 跨帧 `evaluate` 读变量正常、事件委托能打点，但应用内 Promise/等待不推进。

## 根因判定（按序取证，勿空想）

1. 顶层页面注入 `setInterval(100/200ms)` 记录 `performance.now()`，数秒后读间隔：**实际约 1000ms** → OS 窗口未聚焦，全页定时器被节流。
2. 读 `document.visibilityState` 与 iframe 的 `contentDocument.visibilityState`：测试 iframe 常为 **hidden**（即使父页 visible、iframe 移入视口、`focus()` 也无法改变），节流会进一步恶化到每分钟一次。
3. 对照实验：`new MessageChannel()` + `port.postMessage` 自循环在同样环境下**不被节流**（同毫秒连续执行）。
4. Web Audio 心跳（静音 OscillatorNode）在新版 Chrome 已**无法**解除节流，不必再试。

## 修复方案（runner 侧，不改被测应用时序）

1. 用 MessageChannel 宏任务滴答替代 settle 用的 setTimeout：

```js
function mtick(n){ return new Promise(res=>{
  const ch=new MessageChannel(); let i=0;
  ch.port1.onmessage=()=>{ if(++i>=n){ch.port1.onmessage=null;res();} else ch.port2.postMessage(0); };
  ch.port2.postMessage(0);
});}
/* 渲染/IDB/事件回调的让出等待：按旧毫秒数折算滴答 */
const sleep=ms=>mtick(Math.max(4,Math.ceil((ms||0)/12)));
```

2. 保留真实墙钟等待给「真实计时器」：防抖自动保存、冥想秒表等用 `const rsleep=ms=>new Promise(r=>setTimeout(r,ms));`（失焦下约 1s 粒度，给足时长）。
3. `waitFor` 的断言函数必须 `await`（`const r=await fn()`），且 FileReader/IDB/异步 reset 类断言改成**等待结果出现**而非固定滴答数，例如：
   - 文件导入：`await waitFor(()=>/已导入/.test(toastText()),4000)`，不要 `await sleep(120)` 后断言残留 toast（上一条 toast 会造成假通过/假失败）。
   - 调用异步 `__app.reset()` 的老测试必须 `await`，否则宏任务变快后竞态立即暴露。
4. `createObjectURL` mock 会被多种 blob 共用（导出 JSON、CSV、日记缩略图 PNG）：**按 MIME 记录全部 blob**，取用时按 `type==='application/json'` / `indexOf('text/csv')===0` 反向查找，不要只存最后一个。
5. 注意 FileReader 以 `readAsText` 读带 BOM 的 UTF-8 Blob 时 BOM 可能被解码器吞掉——BOM 断言放在纯函数（字符串）层测，集成层测内容即可。

## 布局与轮询注意

- runner 的被测 iframe 放结果区之前、首屏可见（`display:block;height:520px`），虽不能解除节流，但便于人工观察。
- 长套件用多次短轮询（每次 browser_wait_for ≤ 60s、Exec 脚本 ≤ ~60s），单次过长会被 IDE 超时。
- browser_evaluate 跨帧导航瞬间可能抛 GUEST_VIEW_MANAGER_CALL，轮询需容错；同一控制台上下文避免重复 `const/var` 声明（Identifier already declared），用无声明表达式。

## 验证

修复后隔离组（`runner.html?grp=2.2`）应秒级完成；全量 110 项约 60 秒跑完。连续跑两轮确认 SW 缓存等不引入 flaky。
