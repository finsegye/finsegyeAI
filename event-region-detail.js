(function (global) {
  'use strict';

  const REGION_ID = 'shopLoc';
  const DETAIL_ID = 'shopLocDetail';
  const HINT_ID = 'eventRegionDetailHint';
  let baseRegion = '';

  function byId(id) {
    return document.getElementById(id);
  }

  function updateCombinedValue() {
    const region = byId(REGION_ID);
    const detail = byId(DETAIL_ID);
    if (!region || !detail || !baseRegion) return;
    region.value = [baseRegion, detail.value.trim()].filter(Boolean).join(' ');
  }

  function enable(regionValue) {
    const region = byId(REGION_ID);
    const detail = byId(DETAIL_ID);
    const hint = byId(HINT_ID);
    if (!region || !detail) return;

    baseRegion = String(regionValue || '').trim();
    region.value = baseRegion;
    region.readOnly = true;
    region.setAttribute('readonly', 'readonly');
    region.setAttribute('onclick', 'openRegionMap()');
    detail.value = '';
    detail.disabled = false;
    detail.placeholder = '상세 주소를 입력해 주세요 (도로명·건물명·층·호수)';
    if (hint) {
      hint.textContent = '선택 지역: ' + baseRegion + ' · 아래 칸에 상세 주소를 입력해 주세요.';
      hint.classList.add('editing');
    }
    detail.focus();
  }

  function reset() {
    const region = byId(REGION_ID);
    const detail = byId(DETAIL_ID);
    const hint = byId(HINT_ID);
    baseRegion = '';
    if (region) {
      region.value = '';
      region.readOnly = true;
      region.setAttribute('readonly', 'readonly');
      region.setAttribute('onclick', 'openRegionMap()');
      region.placeholder = '행사 지역을 지도에서 선택해 주세요';
    }
    if (detail) {
      detail.value = '';
      detail.disabled = true;
      detail.placeholder = '지역을 먼저 선택해 주세요';
    }
    if (hint) {
      hint.textContent = '지역을 선택하면 위 칸 아래에 상세 주소를 입력할 수 있습니다.';
      hint.classList.remove('editing');
    }
  }

  function install() {
    const detail = byId(DETAIL_ID);
    if (!detail) return;
    detail.addEventListener('input', updateCombinedValue);
    const style = document.createElement('style');
    style.textContent = '.event-region-detail-input{margin-top:8px!important;border:2px solid #555!important}.event-region-detail-input:not(:disabled){border-color:gold!important;box-shadow:0 0 0 2px rgba(255,215,0,.18)}.event-region-detail-input:disabled{opacity:.55}.event-region-detail-hint{margin-top:6px;color:#aaa;font-size:.78em;line-height:1.45}.event-region-detail-hint.editing{color:#00ffcc}';
    document.head.appendChild(style);
  }

  const api = Object.freeze({
    id: 'eventRegionDetail',
    title: '행사 지역과 상세 주소 독립 입력',
    enable: enable,
    reset: reset,
    sync: updateCombinedValue
  });

  global.FinsegyeEventRegionDetail = api;
  global.FinsegyeModules?.register({
    id: api.id,
    title: api.title,
    file: 'event-region-detail.js',
    exports: ['enable', 'reset', 'sync']
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})(window);
