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
  function renderSummary() {
    const dates = sortedDates();
    const display = byId('eventSpecificDatesDisplay');
    const summary = byId('selectedSpecificDatesSummary');
    if (display) display.textContent = dates.length ? `특정 날짜 ${dates.length}개 선택 ▾` : '특정 날짜 여러 개 ▾';
    if (summary) summary.textContent = dates.length ? dates.map(pretty).join(' · ') : '연속 기간 또는 원하는 날짜 여러 개를 선택할 수 있습니다.';
  }
  function setMode(mode) {
    const input = byId('eventDateMode');
    if (input) input.value = mode;
    byId('eventContinuousDateButton')?.classList.toggle('selected', mode === 'range');
    byId('eventSpecificDatesDisplay')?.classList.toggle('selected', mode === 'specific');
  }
  function clearRepeat() {
    const repeat = byId('eventRepeat');
    if (repeat) repeat.value = 'none';
    const monthDays = byId('eventMonthDays');
    if (monthDays) monthDays.value = '';
    document.querySelectorAll('input[name="eventWeekday"]').forEach(el => el.remove());
    const repeatDisplay = byId('eventRepeatDisplay');
    if (repeatDisplay) repeatDisplay.textContent = '반복 없음 ▾';
    const repeatSummary = byId('selectedRepeatSummary');
    if (repeatSummary) repeatSummary.textContent = '특정 날짜 선택에서는 반복하지 않습니다.';
  }
  function applyDates() {
    const dates = sortedDates();
    const hidden = byId('eventSpecificDates');
    if (hidden) hidden.value = dates.join(',');
    if (dates.length) {
      byId('eventStartDate').value = dates[0];
      byId('eventEndDate').value = dates[dates.length - 1];
      byId('eventStartDateDisplay').textContent = pretty(dates[0]) + ' ▾';
      byId('eventEndDateDisplay').textContent = pretty(dates[dates.length - 1]) + ' ▾';
      setMode('specific');
      clearRepeat();
    }
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
  global.useContinuousEventDates = function () {
    state.selected.clear();
    const hidden = byId('eventSpecificDates');
    if (hidden) hidden.value = '';
    setMode('range');
    renderSummary();
  };

  const api = Object.freeze({
    id: 'specificEventDates',
    title: '불규칙 특정 행사 날짜',
    collect() {
      return {
        mode: byId('eventDateMode')?.value || 'range',
        dates: (byId('eventSpecificDates')?.value || '').split(',').filter(Boolean)
      };
    },
    validate() {
      const data = this.collect();
      return data.mode !== 'specific' || data.dates.length > 0;
    },
    reset() {
      state.selected.clear();
      if (byId('eventDateMode')) byId('eventDateMode').value = 'range';
      if (byId('eventSpecificDates')) byId('eventSpecificDates').value = '';
      setMode('range');
      renderSummary();
    }
  });

  global.FinsegyeSpecificEventDates = api;
  global.FinsegyeModules?.register({
    id: api.id,
    title: api.title,
    file: 'specific-event-dates.js',
    exports: ['openSpecificEventDatePicker', 'useContinuousEventDates']
  });
  document.addEventListener('DOMContentLoaded', renderSummary, { once: true });
})(window);
