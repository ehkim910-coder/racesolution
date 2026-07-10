/* ============================================================
   form.js — 단계형 상담 폼 로직 (step-form.html 규약 구현)
   규약: .v2-form / fieldset[data-step] / [data-auto-advance]
        / [data-form-next] / [data-form-prev] / [data-step-current]
        / [data-step-total] / .v2-form-progress-fill / [data-privacy-more]
   제출: window.LEAD_ENDPOINT 가 있으면 POST(JSON), 없으면 성공 화면만 표시.
   ============================================================ */
(() => {
  const form = document.getElementById('consultation-form-v2');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.v2-form-step'));
  const success = form.querySelector('[data-step="success"]');
  const fill = form.querySelector('.v2-form-progress-fill');
  const curEl = form.querySelector('[data-step-current]');
  const totalEl = form.querySelector('[data-step-total]');
  const total = steps.length;
  if (totalEl) totalEl.textContent = String(total);

  let index = 0; // 0-based

  const render = () => {
    steps.forEach((s, i) => { s.hidden = i !== index; });
    if (success) success.hidden = true;
    if (curEl) curEl.textContent = String(index + 1);
    if (fill) fill.style.width = Math.round(((index + 1) / total) * 100) + '%';
    const active = steps[index];
    const firstField = active && active.querySelector('input:not([type=radio]):not([type=checkbox]), textarea, input[type=radio]');
    if (firstField && index > 0) { try { firstField.focus({ preventScroll: true }); } catch (_) {} }
  };

  // 현재 단계 유효성 — required 필드만 검사
  const validateStep = (step) => {
    const required = Array.from(step.querySelectorAll('[required]'));
    for (const el of required) {
      if (el.type === 'checkbox' && !el.checked) { el.focus(); return false; }
      if (el.type === 'radio') {
        const group = step.querySelectorAll(`[name="${el.name}"]`);
        if (![...group].some((r) => r.checked)) { el.focus(); return false; }
      } else if (!String(el.value || '').trim()) { el.focus(); return false; }
    }
    return true;
  };

  const go = (dir) => {
    if (dir > 0 && !validateStep(steps[index])) {
      steps[index].classList.add('v2-form-step--error');
      setTimeout(() => steps[index].classList.remove('v2-form-step--error'), 600);
      return;
    }
    index = Math.max(0, Math.min(total - 1, index + dir));
    render();
  };

  // 라디오 자동 진행
  form.querySelectorAll('.v2-form-step[data-auto-advance]').forEach((step) => {
    step.querySelectorAll('input[type=radio]').forEach((radio) => {
      radio.addEventListener('change', () => { if (index < total - 1) setTimeout(() => go(1), 180); });
    });
  });

  form.querySelectorAll('[data-form-next]').forEach((b) => b.addEventListener('click', () => go(1)));
  form.querySelectorAll('[data-form-prev]').forEach((b) => b.addEventListener('click', () => go(-1)));

  // 개인정보 더보기 토글
  const moreBtn = form.querySelector('[data-privacy-more]');
  if (moreBtn) {
    const detail = form.querySelector('.v3-privacy-detail');
    moreBtn.addEventListener('click', () => {
      const open = detail.hasAttribute('hidden');
      if (open) detail.removeAttribute('hidden'); else detail.setAttribute('hidden', '');
      moreBtn.setAttribute('aria-expanded', String(open));
      moreBtn.textContent = open ? '접기' : '더보기';
    });
  }

  // 연락처 자동 하이픈
  const phone = form.querySelector('#v2-phone');
  if (phone) {
    phone.addEventListener('input', () => {
      let v = phone.value.replace(/\D/g, '').slice(0, 11);
      if (v.length >= 8) v = v.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      else if (v.length >= 4) v = v.replace(/(\d{3})(\d{1,4})/, '$1-$2');
      phone.value = v;
    });
  }

  // 제출
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(steps[index])) return;

    // 다중선택(benefits 등)을 배열로 모은 뒤, 시트 저장용으로 콤마 결합
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (data[k] !== undefined) data[k] = [].concat(data[k], v);
      else data[k] = v;
    }
    Object.keys(data).forEach((k) => { if (Array.isArray(data[k])) data[k] = data[k].join(', '); });
    data.submittedAt = new Date().toISOString();
    data.pageUrl = location.href;

    const submitBtn = form.querySelector('button[type=submit]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '접수 중…'; }

    try {
      if (window.LEAD_ENDPOINT) {
        // Google Apps Script 웹앱은 CORS 응답을 주지 않으므로 no-cors로 전송한다.
        // (응답은 못 읽지만 시트 저장은 정상 동작)
        await fetch(window.LEAD_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(data),
        });
      } else {
        console.log('[슈슈몽드 상담 신청]', data);
      }
    } catch (err) {
      console.error('lead submit error', err);
    }

    steps.forEach((s) => { s.hidden = true; });
    if (fill) fill.style.width = '100%';
    if (curEl) curEl.textContent = String(total);
    if (success) success.hidden = false;
  });

  render();
})();
