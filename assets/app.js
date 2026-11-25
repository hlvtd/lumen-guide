// Lumen 설명서: 검색 · 목차 따라가기 · 모바일 목차 · 명령 복사
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- 검색 색인: .topic(제목 + 글) ----------
  // 같은 말을 여러 가지로 찾을 수 있게(예: '비밀번호' → 인증번호)
  const ALIAS = {
    비밀번호: "인증번호", 비번: "인증번호", 패스워드: "인증번호", pin: "인증번호",
    카드: "출입증", 카드키: "출입증", 키카드: "출입증", 사원증: "출입증",
    관리자키: "마스터키", 마스터카드: "마스터키",
    문: "보안문", 도어: "보안문", door: "보안문",
    렉: "렉", 끊김: "렉", 버벅: "렉",
    광고: "전광판", 모니터: "화면", tv: "tv",
  };
  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "");
  const index = $$(".topic").map((el) => {
    const h = el.querySelector("h2, h3, h4");
    const title = el.dataset.title || (h ? h.textContent.trim() : "");
    const chapter = el.closest("section.ch")?.dataset.chapter || "";
    const text = el.textContent.replace(/\s+/g, " ").trim();
    return { el, id: el.id, title, chapter, text, ntitle: norm(title), ntext: norm(text), keys: norm(el.dataset.keys || "") };
  });

  const input = $("#q");
  const box = $("#results");
  let sel = -1, cur = [];

  function snippet(text, q) {
    const i = norm(text).indexOf(q);
    if (i < 0) return text.slice(0, 90) + (text.length > 90 ? "…" : "");
    // 공백 없앤 위치 → 원문 위치로 대충 맞추기
    let n = 0, at = 0;
    for (; at < text.length && n < i; at++) if (!/\s/.test(text[at])) n++;
    const start = Math.max(0, at - 30);
    const end = Math.min(text.length, at + 60);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }
  function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function mark(s, words) {
    let out = esc(s);
    for (const w of words) {
      if (!w) continue;
      const re = new RegExp(w.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*"), "gi");
      out = out.replace(re, (m) => `<mark>${m}</mark>`);
    }
    return out;
  }
  function search(raw) {
    const words = raw.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const ws = words.map((w) => {
      const n = norm(w);
      return [n, ALIAS[n] ? norm(ALIAS[n]) : null];
    });
    const res = [];
    for (const it of index) {
      let score = 0, ok = true;
      for (const [w, a] of ws) {
        const hitT = it.ntitle.includes(w) || (a && it.ntitle.includes(a));
        const hitK = it.keys.includes(w) || (a && it.keys.includes(a));
        const hitX = it.ntext.includes(w) || (a && it.ntext.includes(a));
        if (!hitT && !hitK && !hitX) { ok = false; break; }
        score += hitT ? 10 : hitK ? 6 : 1;
        if (it.ntitle.startsWith(w)) score += 4;
      }
      if (ok) res.push({ it, score });
    }
    res.sort((a, b) => b.score - a.score || a.it.title.length - b.it.title.length);
    return res.slice(0, 10).map((r) => r.it);
  }
  function render() {
    const q = input.value;
    cur = search(q);
    sel = cur.length ? 0 : -1;
    if (!q.trim()) { box.classList.remove("open"); return; }
    const words = q.trim().split(/\s+/).flatMap((w) => [w, ALIAS[norm(w)] || ""]);
    box.innerHTML = cur.length
      ? cur.map((it, i) => `<a href="#${it.id}" data-i="${i}" class="${i === sel ? "sel" : ""}"><div class="c">${esc(it.chapter)}</div><div class="t">${mark(it.title, words)}</div><div class="s">${mark(snippet(it.text, norm(q.trim().split(/\s+/)[0])), words)}</div></a>`).join("")
      : `<div class="none">“${esc(q)}”에 맞는 내용이 없어요. 다른 낱말로 찾아보세요.<br>예: 보안문, 출입증, 인증번호, 전광판, 렉</div>`;
    box.classList.add("open");
  }
  function go(it) {
    if (!it) return;
    box.classList.remove("open");
    input.blur();
    history.replaceState(null, "", "#" + it.id);
    it.el.scrollIntoView({ behavior: "instant", block: "start" }); // 먼 거리는 부드럽게 굴리면 중간에 멈출 수 있어 바로 이동
    it.el.classList.remove("flash");
    void it.el.offsetWidth;
    it.el.classList.add("flash");
    closeMenu();
  }
  input.addEventListener("input", render);
  input.addEventListener("focus", () => input.value.trim() && render());
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!cur.length) return;
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : cur.length - 1)) % cur.length;
      $$("a", box).forEach((a, i) => a.classList.toggle("sel", i === sel));
      $$("a", box)[sel]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(cur[Math.max(0, sel)]);
    } else if (e.key === "Escape") {
      box.classList.remove("open");
      input.blur();
    }
  });
  box.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-i]");
    if (!a) return;
    e.preventDefault();
    go(cur[+a.dataset.i]);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) box.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    const typing = /input|textarea/i.test(document.activeElement?.tagName || "");
    if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  // ---------- 목차: 지금 보는 곳 표시 ----------
  const links = $$(".side a[href^='#']");
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  let lastOn = null;
  function spy() {
    let best = null;
    for (const t of targets) {
      if (t.getBoundingClientRect().top - 200 <= 0) best = t;
      else break;
    }
    const a = best ? byId.get(best.id) : links[0];
    if (a && a !== lastOn) {
      lastOn?.classList.remove("on");
      a.classList.add("on");
      lastOn = a;
      const side = $(".side");
      const r = a.getBoundingClientRect(), sr = side.getBoundingClientRect();
      if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) a.scrollIntoView({ block: "nearest" });
    }
    $(".totop").classList.toggle("show", scrollY > 900);
  }
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { spy(); ticking = false; });
  }, { passive: true });
  spy();
  // 주소에 #이 붙어 들어오면 그 위치로 바로(부드러운 스크롤이 중간에 멈추는 경우가 있어서)
  if (location.hash) {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) requestAnimationFrame(() => { t.scrollIntoView({ behavior: "instant", block: "start" }); spy(); });
  }

  // ---------- 모바일 목차 ----------
  const side = $(".side"), scrim = $(".scrim");
  function closeMenu() { side.classList.remove("open"); scrim.classList.remove("open"); }
  $(".menu-btn").addEventListener("click", () => { side.classList.toggle("open"); scrim.classList.toggle("open"); });
  scrim.addEventListener("click", closeMenu);
  links.forEach((a) => a.addEventListener("click", closeMenu));

  // ---------- 명령 복사 · 맨 위로 ----------
  $$(".cmd button").forEach((b) => b.addEventListener("click", async () => {
    const t = b.parentElement.querySelector("span").textContent;
    try { await navigator.clipboard.writeText(t); b.textContent = "복사됨"; } catch { b.textContent = "길게 눌러 복사"; }
    setTimeout(() => (b.textContent = "복사"), 1600);
  }));
  $(".totop").addEventListener("click", () => scrollTo({ top: 0 }));
})();
