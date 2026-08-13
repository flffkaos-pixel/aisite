import { useLayoutEffect } from "react";

/**
 * 디자인 기준: yeguozi.com의 색상 아카이브를 원본 프레임 순서와 팔레트로 재현한다.
 * 원본 Film Mood CSS는 수정하지 않으며, 이 어댑터는 정본 데이터와 경로별 콘텐츠만 연결한다.
 */

const SOURCE_ORIGIN = "https://film-mood.pages.dev";
const SOURCE_STYLESHEET = `${SOURCE_ORIGIN}/css/style.css`;
const SOURCE_SCRIPTS = ["js/images-manifest.js", "js/data.js", "js/film-details-full.js", "js/academy-full.js", "js/i18n.js", "js/app.js"];
const COLOR_MANIFEST_URL = "/manus-storage/yeguozi-color-stills-storage_09d243dd.json";
const FRAME_BATCH_SIZE = 24;

type PaletteTone = { hex: string; pct: number };
type SourceFrame = {
  id: string;
  thumbPath: string;
  thumbDigest: string;
  storagePath?: string;
  palette: PaletteTone[];
  filmSlug: string;
  filmTitleEn?: string;
  filmTitle?: string;
  spaceRooms?: string[];
  spaceObjects?: string[];
};
type FrameManifest = { colors: Record<string, SourceFrame[]> };
type ColorDetail = { ko: string; en: string; hex: string; note: string; related: string[] };

const COLOR_DETAILS: Record<string, ColorDetail> = {
  red: { ko: "레드", en: "Red", hex: "#C0453A", note: "가까이 다가오는 온기와 긴장. 레드는 대사보다 먼저 장면의 공간을 채웁니다.", related: ["orange", "earth", "purple"] },
  orange: { ko: "오렌지", en: "Orange", hex: "#C8753A", note: "노을빛, 오래된 나무, 그리고 사람이 머문 방의 부드러운 온기.", related: ["red", "yellow", "earth"] },
  earth: { ko: "어스", en: "Earth", hex: "#7A5A3B", note: "나무, 가죽, 돌, 커피의 색. 생활감 있는 영화 공간을 모았습니다.", related: ["orange", "red", "green"] },
  yellow: { ko: "옐로우", en: "Yellow", hex: "#D7A641", note: "빛나는 낮, 황동, 그리고 방 안에 남아 있는 조용한 낙관.", related: ["orange", "red", "earth"] },
  green: { ko: "그린", en: "Green", hex: "#5D7B55", note: "정원 같은 방, 녹음의 그림자, 천천히 고요해지는 실내의 색.", related: ["teal", "earth", "yellow"] },
  teal: { ko: "틸", en: "Teal", hex: "#3C7574", note: "물빛, 유약을 바른 도자기, 방의 균형을 잡는 차가운 그림자.", related: ["green", "blue", "earth"] },
  blue: { ko: "블루", en: "Blue", hex: "#42698A", note: "밤의 깊이, 긴 잔상, 그리고 차가운 파란빛이 남긴 거리.", related: ["teal", "mono", "purple"] },
  purple: { ko: "퍼플", en: "Purple", hex: "#75465E", note: "해질녘, 벨벳, 기억 그리고 보랏빛 방이 갖는 연극적 끌림.", related: ["red", "blue", "orange"] },
  mono: { ko: "흑백", en: "Mono", hex: "#565656", note: "필름 그레인, 대비, 그리고 빛의 본질만 남겨진 방.", related: ["blue", "earth", "red"] },
};

let manifestCache: FrameManifest | null = null;
let manifestPromise: Promise<FrameManifest> | null = null;

declare global {
  interface Window {
    renderPage?: () => void;
    switchLang?: () => void;
    pimg?: (url: string) => string;
    filmMoodArchiveBooted?: boolean;
  }
}

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.ready === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    script.onload = () => { script.dataset.ready = "true"; resolve(); };
    script.onerror = () => reject(new Error(src));
    document.body.appendChild(script);
  });
}

function restoreSourceData() {
  if (document.getElementById("film-mood-source-data-restoration")) return;
  const script = document.createElement("script");
  script.id = "film-mood-source-data-restoration";
  script.text = `(function(){const images=["/manus-storage/nostalghia_63a9d4b7.webp","/manus-storage/ivans-childhood_53d45e5b.webp","/manus-storage/its-complicated_acd72b6a.webp","/manus-storage/parasite_fe4edaab.webp","/manus-storage/le-bonheur_ff732451.webp","/manus-storage/green-papaya_e25dc327.webp"];if(typeof DIRECTOR_DATA!=="undefined")DIRECTOR_DATA.forEach(function(p,i){p.img=images[i%images.length]});if(typeof CINEMATOGRAPHER_DATA!=="undefined")CINEMATOGRAPHER_DATA.forEach(function(p,i){p.img=images[(i+2)%images.length]})})();`;
  document.body.appendChild(script);
}

function loadManifest() {
  if (manifestCache) return Promise.resolve(manifestCache);
  if (!manifestPromise) {
    manifestPromise = fetch(COLOR_MANIFEST_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Frame manifest ${response.status}`);
        return response.json() as Promise<FrameManifest>;
      })
      .then((manifest) => {
        manifestCache = manifest;
        return manifest;
      });
  }
  return manifestPromise;
}

function getColorSlug() {
  const match = window.location.hash.match(/^#\/color\/([^/?]+)/);
  return match?.[1] ?? null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character);
}

function sourceFrameUrl(frame: SourceFrame) {
  if (frame.storagePath) return frame.storagePath;
  const thumbPath = frame.thumbPath.replace("/thumbs/", "/thumbs/480/");
  return `https://img.yeguozi.com${thumbPath}?sid=${encodeURIComponent(frame.id)}&dig=${frame.thumbDigest}&tv=4&rv=4`;
}

function describeFrame(frame: SourceFrame) {
  const labels = [...(frame.spaceRooms ?? []), ...(frame.spaceObjects ?? [])];
  return [frame.filmTitleEn ?? frame.filmTitle ?? "Untitled", ...labels].join(" · ");
}

function showLightbox(src: string) {
  const lightbox = document.getElementById("lightbox");
  const image = document.getElementById("lightboxImg") as HTMLImageElement | null;
  if (!lightbox || !image) return;
  image.src = src;
  lightbox.classList.add("active");
}

function frameCard(frame: SourceFrame, index: number) {
  const title = escapeHtml(describeFrame(frame));
  const source = sourceFrameUrl(frame);
  const palette = frame.palette.map((tone) => `<button type="button" class="tone-copy" data-tone="${tone.hex}" title="${tone.hex} · ${tone.pct}%" style="display:block;flex:${Math.max(tone.pct, 2)};height:11px;border:0;background:${tone.hex};cursor:copy"></button>`).join("");
  return `<article style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;position:relative"><button type="button" class="save-frame" style="position:absolute;right:10px;top:10px;z-index:1;border:1px solid rgba(255,255,255,.28);background:rgba(13,13,13,.72);color:var(--text);border-radius:18px;padding:5px 10px;font-size:11px">Save</button><img class="frame-image" data-source="${source}" src="${source}" alt="${title}" loading="lazy" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;cursor:zoom-in"><div class="frame-palette" style="display:flex">${palette}</div><div style="padding:10px 12px 13px"><a href="#/films" style="color:var(--text);font-size:13px">${title}</a><div style="color:var(--text3);font-size:11px;margin-top:3px">Frame ${String(index + 1).padStart(3, "0")} · ${frame.palette.length} color palette</div></div></article>`;
}

function renderEditorialColorDetail() {
  const slug = getColorSlug();
  if (!slug || !COLOR_DETAILS[slug]) return;
  const main = document.querySelector("main");
  if (!main) return;
  if (!manifestCache) {
    main.innerHTML = '<div class="loading"><div class="spinner" />원본 프레임 아카이브를 불러오는 중입니다.</div>';
    void loadManifest().then(() => { if (getColorSlug() === slug) renderEditorialColorDetail(); }).catch(() => {
      if (getColorSlug() === slug) main.innerHTML = '<div class="loading">원본 프레임 아카이브를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</div>';
    });
    return;
  }

  const detail = COLOR_DETAILS[slug];
  const sourceFrames = manifestCache.colors[slug] ?? [];
  const related = detail.related.map((id) => {
    const item = COLOR_DETAILS[id];
    return `<a href="#/color/${id}" style="display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;color:var(--text2);font-size:12px"><span style="width:10px;height:10px;border-radius:50%;background:${item.hex}"></span>${item.ko}</a>`;
  }).join("");
  const headerPalette = (sourceFrames[0]?.palette ?? []).map((tone) => `<button type="button" class="tone-copy" data-tone="${tone.hex}" title="${tone.hex} · ${tone.pct}%" style="border:0;background:${tone.hex};height:42px;flex:${Math.max(tone.pct, 2)};min-width:18px;cursor:copy"></button>`).join("");

  main.innerHTML = `<div class="page-header" style="padding-bottom:10px"><a href="#/colors" style="color:var(--text3);font-size:13px">← 색상</a></div><section class="section" style="padding-top:14px"><div class="color-detail-hero" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:36px;align-items:start;margin-bottom:38px"><div><div style="display:flex;gap:16px;align-items:center;margin-bottom:18px"><div style="width:72px;height:72px;border-radius:7px;background:${detail.hex};border:1px solid rgba(255,255,255,.16)"></div><div><h1 style="font-family:var(--font-serif);font-size:clamp(36px,5vw,58px);font-weight:400;line-height:1;margin:0">${detail.ko}</h1><div style="color:var(--text3);font-size:13px;margin-top:8px">${sourceFrames.length.toLocaleString("en-US")} actual screenshots</div></div></div><p style="color:var(--text2);font-size:16px;line-height:1.7;max-width:640px;margin:0">${detail.note}</p></div><div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:var(--text3);letter-spacing:.12em;text-transform:uppercase">First-frame palette</span><button type="button" class="filter-btn tone-copy" data-tone="${detail.hex}">${detail.hex}</button></div><div style="display:flex;border-radius:7px;overflow:hidden">${headerPalette}</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:16px">${related}</div></div></div><div style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:15px 0 18px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:22px"><span id="frame-progress" style="color:var(--text2);font-size:13px">원본 프레임 0 / ${sourceFrames.length.toLocaleString("en-US")}</span><div class="filter-bar" style="margin:0;padding:0;border:0"><button type="button" class="filter-btn active" data-layout="grid">Grid</button><button type="button" class="filter-btn" data-layout="film">By film</button><button type="button" class="filter-btn" data-layout="large">Large flow</button><button type="button" class="filter-btn" data-palette-toggle="true">팔레트 숨기기</button></div></div><div id="editorial-frame-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px"></div><div id="frame-sentinel" style="height:1px"></div><div style="display:flex;justify-content:center;padding:28px 0"><button type="button" id="load-more-frames" class="btn btn-secondary">원본 프레임 더 보기</button></div></section>`;

  const grid = main.querySelector<HTMLElement>("#editorial-frame-grid");
  const progress = main.querySelector<HTMLElement>("#frame-progress");
  const loadMoreButton = main.querySelector<HTMLButtonElement>("#load-more-frames");
  const sentinel = main.querySelector<HTMLElement>("#frame-sentinel");
  let orderedFrames = [...sourceFrames];
  let visibleCount = 0;
  let observer: IntersectionObserver | null = null;

  const updateProgress = () => {
    if (progress) progress.textContent = `원본 프레임 ${visibleCount.toLocaleString("en-US")} / ${orderedFrames.length.toLocaleString("en-US")}`;
    if (loadMoreButton) {
      loadMoreButton.hidden = visibleCount >= orderedFrames.length;
      loadMoreButton.textContent = visibleCount >= orderedFrames.length ? "모든 원본 프레임을 표시했습니다" : `원본 프레임 더 보기 (${Math.min(FRAME_BATCH_SIZE, orderedFrames.length - visibleCount)})`;
    }
  };
  const appendBatch = () => {
    if (!grid || visibleCount >= orderedFrames.length) return;
    const nextFrames = orderedFrames.slice(visibleCount, visibleCount + FRAME_BATCH_SIZE);
    grid.insertAdjacentHTML("beforeend", nextFrames.map((frame, index) => frameCard(frame, visibleCount + index)).join(""));
    visibleCount += nextFrames.length;
    updateProgress();
  };
  const resetFrames = () => {
    if (!grid) return;
    grid.innerHTML = "";
    visibleCount = 0;
    appendBatch();
  };

  appendBatch();
  loadMoreButton?.addEventListener("click", appendBatch);
  observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) appendBatch(); }, { rootMargin: "700px" });
  if (sentinel) observer.observe(sentinel);

  main.querySelectorAll<HTMLButtonElement>("[data-layout]").forEach((button) => button.addEventListener("click", () => {
    const mode = button.dataset.layout;
    if (grid) grid.style.gridTemplateColumns = mode === "large" ? "1fr" : mode === "film" ? "repeat(auto-fit,minmax(380px,1fr))" : "repeat(auto-fit,minmax(250px,1fr))";
    if (mode === "film") orderedFrames = [...sourceFrames].sort((a, b) => (a.filmTitleEn ?? a.filmTitle ?? "").localeCompare(b.filmTitleEn ?? b.filmTitle ?? ""));
    else orderedFrames = [...sourceFrames];
    main.querySelectorAll("[data-layout]").forEach((item) => item.classList.toggle("active", item === button));
    resetFrames();
  }));
  main.querySelector<HTMLButtonElement>("[data-palette-toggle]")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const hidden = button.dataset.hidden === "true";
    main.querySelectorAll<HTMLElement>(".frame-palette").forEach((item) => { item.style.display = hidden ? "flex" : "none"; });
    button.dataset.hidden = hidden ? "false" : "true";
    button.textContent = hidden ? "팔레트 숨기기" : "팔레트 보이기";
  });
  main.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const saveButton = target.closest<HTMLButtonElement>(".save-frame");
    if (saveButton) { saveButton.textContent = saveButton.textContent === "Save" ? "Saved" : "Save"; return; }
    const tone = target.closest<HTMLButtonElement>(".tone-copy");
    if (tone) { void navigator.clipboard?.writeText(tone.dataset.tone ?? ""); return; }
    const image = target.closest<HTMLImageElement>(".frame-image");
    if (image) showLightbox(image.dataset.source ?? image.src);
  }, { once: true });
}

export default function Home() {
  useLayoutEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        if (!document.getElementById("film-mood-original-css")) {
          const link = document.createElement("link");
          link.id = "film-mood-original-css";
          link.rel = "stylesheet";
          link.href = SOURCE_STYLESHEET;
          document.head.appendChild(link);
        }
        if (!window.filmMoodArchiveBooted) {
          for (const path of SOURCE_SCRIPTS) await loadScript(`film-mood-source-${path.replace(/[^a-z0-9]/gi, "-")}`, `${SOURCE_ORIGIN}/${path}`);
          restoreSourceData();
          window.filmMoodArchiveBooted = true;
        }
        window.pimg = (url: string) => (url?.startsWith("images/") ? `${SOURCE_ORIGIN}/${url}` : url);
        const languageButton = document.querySelector(".lang-toggle") as HTMLButtonElement | null;
        if (languageButton && !languageButton.dataset.bound) {
          languageButton.dataset.bound = "true";
          languageButton.addEventListener("click", () => window.switchLang?.());
        }
        window.renderPage?.();
        requestAnimationFrame(() => { if (active) renderEditorialColorDetail(); });
      } catch (error) {
        console.error("Film Mood archive bootstrap failed", error);
      }
    };
    const handleHashChange = () => window.setTimeout(renderEditorialColorDetail, 0);
    void boot();
    window.addEventListener("hashchange", handleHashChange);
    return () => { active = false; window.removeEventListener("hashchange", handleHashChange); };
  }, []);

  return <><div className="film-grain" style={{ zIndex: 1 }} aria-hidden="true" /><div className="vignette" style={{ zIndex: 1 }} aria-hidden="true" /><header className="site-header"><div className="header-inner"><a href="#/" className="site-logo">Film <span>Mood</span></a><nav className="nav-links" aria-label="주요 메뉴"><a href="#/films">Films</a><a href="#/colors">Colors</a><a href="#/academy">Cinematography</a><a href="#/about">About</a></nav><button type="button" className="lang-toggle">English</button></div></header><main style={{ position: "relative", zIndex: 1000 }} aria-live="polite" suppressHydrationWarning /><footer className="site-footer"><div className="footer-links"><a href="https://github.com/flffkaos-pixel/film-mood" target="_blank" rel="noopener noreferrer">GitHub</a></div><p>© 2026 Film Mood · Film &amp; Home Inspiration</p></footer><div className="lightbox" id="lightbox" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.classList.remove("active"); }}><span className="lightbox-close">×</span><img className="lightbox-img" id="lightboxImg" alt="" /></div></>;
}
