(function (global) {
  'use strict';

  const state = {
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selected: new Set()
  };

  function byId(id) { return document.getElementById(id); }
  function dateValue(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function sortedDates() { return Array.from(state.selected).sort(); }
  function pretty(value) { return value.replaceAll('-', '.'); }
  function readSavedDates() {
    state.selected = new Set((byId('eventSpecificDates')?.value || '').split(',').map(v => v.trim()).filter(Boolean));
  }
  function rangeEnabled() { return byId('eventRangeEnabled')?.value === 'true'; }
  function currentMode() {
    const hasRange = rangeEnabled();
    const hasSpecific = sortedDates().length > 0;
    if (hasRange && hasSpecific) return 'combined';
    if (hasRange) return 'range';
    if (hasSpecific) return 'specific';
    return 'none';
  }
  function renderSummary() {
    const dates = sortedDates();
    const mode = currentMode();
    const display = byId('eventSpecificDatesDisplay');
    const summary = byId('selectedSpecificDatesSummary');
    const start = byId('eventStartDate')?.value || '';
    const end = byId('eventEndDate')?.value || '';
    if (display) display.textContent = dates.length ? `특정 날짜 ${dates.length}개 선택 ▾` : '특정 날짜 추가 ▾';
    if (summary) {
      const parts = [];
      if (rangeEnabled()) parts.push(start && end ? `연속 기간: ${pretty(start)}~${pretty(end)}` : '연속 기간: 시작 날짜와 종료 날짜를 선택해 주세요.');
      if (dates.length) parts.push(`특정 날짜: ${dates.map(pretty).join(' · ')}`);
      summary.textContent = parts.length ? parts.join(' / ') : '연속 기간과 특정 날짜를 각각 또는 함께 추가할 수 있습니다.';
    }
    const input = byId('eventDateMode');
    if (input) input.value = mode;
    byId('eventContinuousDateButton')?.classList.toggle('selected', rangeEnabled());
    byId('eventSpecificDatesDisplay')?.classList.toggle('selected', dates.length > 0);
  }
  function applyDates() {
    const dates = sortedDates();
    const hidden = byId('eventSpecificDates');
    if (hidden) hidden.value = dates.join(',');
    renderSummary();
  }
  function renderCalendar() {
    const body = byId('specificEventCalendarBody');
    if (!body) return;
    const year = state.month.getFullYear();
    const month = state.month.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const today = dateValue(new Date());
    let days = '';
    for (let i = 0; i < firstDay; i += 1) days += '<span class="calendar-empty"></span>';
    for (let day = 1; day <= lastDate; day += 1) {
      const value = dateValue(new Date(year, month, day));
      const classes = [value === today ? 'today' : '', state.selected.has(value) ? 'selected' : ''].filter(Boolean).join(' ');
      days += `<button type="button" class="${classes}" onclick="toggleSpecificEventDate('${value}')">${day}</button>`;
    }
    body.innerHTML = `
      <div class="calendar-head"><button type="button" onclick="moveSpecificEventMonth(-1)">‹</button><div class="calendar-title">${year}년 ${month + 1}월</div><button type="button" onclick="moveSpecificEventMonth(1)">›</button></div>
      <div class="calendar-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
      <div class="calendar-days">${days}</div>
      <div class="picker-summary">선택: ${state.selected.size}개 · 날짜를 다시 누르면 해제됩니다.</div>
      <button type="button" class="choice-done" onclick="finishSpecificEventDates()">선택 완료</button>`;
  }

  global.openSpecificEventDatePicker = function () {
    readSavedDates();
    const first = sortedDates()[0];
    const initial = first ? new Date(first + 'T00:00:00') : new Date();
    state.month = new Date(initial.getFullYear(), initial.getMonth(), 1);
    global.openEventChoice?.('특정 행사 날짜 선택', '<div id="specificEventCalendarBody"></div>');
    if (!byId('specificEventCalendarBody') && typeof global.overlay === 'function') {
      global.overlay('특정 행사 날짜 선택', '<div id="specificEventCalendarBody"></div>');
    }
    renderCalendar();
  };
  global.moveSpecificEventMonth = function (offset) {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + offset, 1);
    renderCalendar();
  };
  global.toggleSpecificEventDate = function (value) {
    if (state.selected.has(value)) state.selected.delete(value); else state.selected.add(value);
    renderCalendar();
  };
  global.finishSpecificEventDates = function () {
    if (!state.selected.size) { alert('특정 행사 날짜를 하나 이상 선택해 주세요.'); return; }
    applyDates();
    global.closeEventChoice?.();
  };
  global.activateContinuousEventDates = function () {
    if (byId('eventRangeEnabled')) byId('eventRangeEnabled').value = 'true';
    renderSummary();
  };
  global.useContinuousEventDates = global.activateContinuousEventDates;
  global.toggleContinuousEventDates = function () {
    const enabled = !rangeEnabled();
    if (byId('eventRangeEnabled')) byId('eventRangeEnabled').value = String(enabled);
    if (!enabled) {
      ['eventStartDate', 'eventEndDate'].forEach(id => { if (byId(id)) byId(id).value = ''; });
      if (byId('eventStartDateDisplay')) byId('eventStartDateDisplay').textContent = '날짜 선택 ▾';
      if (byId('eventEndDateDisplay')) byId('eventEndDateDisplay').textContent = '날짜 선택 ▾';
      byId('eventStartDateDisplay')?.classList.remove('selected');
      byId('eventEndDateDisplay')?.classList.remove('selected');
    }
    renderSummary();
  };

  const api = Object.freeze({
    id: 'specificEventDates',
    title: '불규칙 특정 행사 날짜',
    collect() {
      return {
        mode: currentMode(),
        rangeEnabled: rangeEnabled(),
        startDate: byId('eventStartDate')?.value || '',
        endDate: byId('eventEndDate')?.value || '',
        dates: (byId('eventSpecificDates')?.value || '').split(',').filter(Boolean)
      };
    },
    validate() {
      const data = this.collect();
      if (data.mode === 'none') return false;
      if (data.rangeEnabled && (!data.startDate || !data.endDate)) return false;
      return data.mode !== 'specific' || data.dates.length > 0;
    },
    reset() {
      state.selected.clear();
      if (byId('eventDateMode')) byId('eventDateMode').value = 'none';
      if (byId('eventRangeEnabled')) byId('eventRangeEnabled').value = 'false';
      if (byId('eventSpecificDates')) byId('eventSpecificDates').value = '';
      renderSummary();
    }
  });

  global.FinsegyeSpecificEventDates = api;
  global.FinsegyeModules?.register({
    id: api.id,
    title: api.title,
    file: 'specific-event-dates.js',
    exports: ['openSpecificEventDatePicker', 'activateContinuousEventDates', 'toggleContinuousEventDates']
  });
  document.addEventListener('DOMContentLoaded', renderSummary, { once: true });
})(window);
