/* ============================================================
   interactions.js — 랜딩 인터랙션 통합 모듈
   필요한 기능 IIFE만 남기고 지워도 됨. 각 기능은 해당 요소가
   없으면 조용히 skip(if (!el) return) 하므로 안전하다.
   포함: 무드탭 / 후기토글 / 후기캐러셀 / 장소갤러리 / sticky CTA
        / 히어로영상 / 미디어 저장방지
   ============================================================ */

/* === 무드 탭 전환 (mood-tabs.html) === */
(() => {
  const tabs = document.querySelectorAll('.v3-mood-tab');
  const panels = document.querySelectorAll('.v3-mood-panel');
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.mood;
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.moodPanel === target));
    });
  });
})();

/* === 후기 펼치기/접기 (review-carousel.html) ===
   이벤트 위임이라 캐러셀이 복제한 카드에도 동작한다. */
(() => {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.v5-review-toggle');
    if (!btn) return;
    const review = btn.closest('.v5-review');
    if (!review) return;
    const open = review.classList.toggle('is-open');
    btn.textContent = open ? '접기 ↑' : '전체 보기 →';
  });
})();

/* === 장소 갤러리 — 썸네일 클릭 시 메인 이미지 교체 (place-gallery.html) ===
   오버레이 텍스트는 고정, 메인 <img> src만 교체. */
(() => {
  document.querySelectorAll('[data-place-gallery]').forEach((gallery) => {
    const main = gallery.querySelector('.v5-place-main img');
    const thumbs = gallery.querySelectorAll('.v5-place-thumb');
    if (!main || !thumbs.length) return;
    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const img = thumb.querySelector('img');
        if (!img) return;
        main.src = img.src;
        thumbs.forEach((t) => t.classList.toggle('is-active', t === thumb));
      });
    });
  });
})();

/* === 후기 가로 자동 슬라이드 캐러셀 (review-carousel.html) ===
   카드 복제로 무한 루프 + 드래그/호버/휠 일시정지. */
(() => {
  const track = document.querySelector('.v5-reviews-track');
  if (!track) return;
  const originals = Array.from(track.children);
  if (!originals.length) return;
  originals.forEach((c) => {
    const clone = c.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 0.4;
  let paused = false, resumeTimer = null, period = 0;

  const measure = () => { period = track.children[originals.length].offsetLeft - track.children[0].offsetLeft; };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  const normalize = () => {
    if (!period) return;
    if (track.scrollLeft >= period) track.scrollLeft -= period;
    else if (track.scrollLeft < 0) track.scrollLeft += period;
  };
  const tick = () => { if (!paused) { track.scrollLeft += SPEED; normalize(); } requestAnimationFrame(tick); };
  const pause = () => { paused = true; clearTimeout(resumeTimer); };
  const resumeSoon = (d) => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { paused = false; }, d); };
  const resumeNow = () => { clearTimeout(resumeTimer); paused = false; };

  let dragging = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    moved = false;
    if (e.target.closest('a, button')) { pause(); return; }
    if (e.pointerType === 'mouse') {
      dragging = true; startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add('dragging'); track.setPointerCapture(e.pointerId);
    }
    pause();
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 6) moved = true;
    track.scrollLeft = startScroll - (e.clientX - startX) * 1.6;
    normalize();
  });
  const endDrag = (e) => {
    if (dragging) { dragging = false; track.classList.remove('dragging'); }
    try { if (e && e.pointerId != null) track.releasePointerCapture(e.pointerId); } catch (_) {}
    resumeSoon(400);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('mouseenter', pause);
  track.addEventListener('mouseleave', () => resumeSoon(200));
  track.addEventListener('touchstart', () => { moved = false; }, { passive: true });
  track.addEventListener('touchmove', () => { moved = true; pause(); }, { passive: true });
  track.addEventListener('touchend', resumeNow, { passive: true });
  track.addEventListener('touchcancel', resumeNow, { passive: true });
  track.addEventListener('wheel', () => { pause(); resumeSoon(600); }, { passive: true });

  if (!reduce) requestAnimationFrame(tick);
})();

/* === Sticky 모바일 CTA (base.css .v3-sticky-cta) ===
   공감 섹션(.v5-worry)이 보이기 시작하면 노출. 폼에선 숨김 처리하려면
   아래 hero/consult 관찰 버전을 쓰거나, 단순 노출만 원하면 위 버전 사용.
   기본: 공감 섹션 진입 시 노출(가장 단순). */
(() => {
  const sticky = document.querySelector('.v3-sticky-cta');
  const trigger = document.querySelector('.v5-worry') || document.querySelector('.v3-hero');
  if (!sticky || !trigger || !('IntersectionObserver' in window)) return;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) sticky.classList.add('is-visible');
  }, { threshold: 0 }).observe(trigger);
})();

/* === 히어로 배경 영상 — 시작지점 고정 + 종료 시 되감기 (hero.html) ===
   영상 src의 #t=초 와 START 값을 맞춰라. */
(() => {
  const v = document.getElementById('v7-hero-video');
  if (!v) return;
  const START = 0; // 처음부터 재생 (loop 사용)
  const seekStart = () => { try { v.currentTime = START; } catch (e) {} };
  v.addEventListener('loadedmetadata', seekStart);
  v.addEventListener('ended', () => { seekStart(); v.play(); });
})();

/* === 이미지·영상 저장 방지 (우클릭/드래그) ===
   완전 차단은 불가, 일반 저장만 억제. */
(() => {
  const isMedia = (el) => el && (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'PICTURE' || el.tagName === 'SOURCE');
  document.addEventListener('contextmenu', (e) => {
    if (isMedia(e.target) || (e.target.closest && e.target.closest('img, video, picture'))) e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => { if (isMedia(e.target)) e.preventDefault(); });
})();

/* === 모바일 헤더 햄버거 메뉴 === */
(() => {
  const toggle = document.querySelector('.v3-nav-toggle');
  const nav = document.querySelector('.v3-nav');
  if (!toggle || !nav) return;
  const set = (open) => { nav.classList.toggle('is-open', open); toggle.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => set(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.tagName === 'A') set(false); });
})();