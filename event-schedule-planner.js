(function (global) {
  'use strict';

  const state = {
    repeatMode: '',
    weekdays: new Set(),
    monthDays: new Set(),
    timeSlots: [],
    holidayPolicy: '',
    holidayTimeSlots: []
  };
  const weekdayOrder = ['월','화','수','목','금','토','일'];

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function minutes(value) { const [h,m] = value.split(':').map(Number); return h * 60 + m; }
  function prettySlots(slots) { return slots.map(slot => `${slot.start}~${slot.end}`).join(' / '); }
  function timeOptions() {
    const values = [];
    for (let h = 0; h < 24; h += 1) for (const m of [0,30]) values.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    return values.map(value => `<option value="${value}">${value}</option>`).join('');
  }
  function sortedWeekdays() { return weekdayOrder.filter(day => state.weekdays.has(day)); }
  function sortedMonthDays() { return Array.from(state.monthDays).sort((a,b) => a-b); }

  function dateSummary() {
    const range = byId('eventRangeEnabled')?.value === 'true';
    const start = byId('eventStartDate')?.value || '';
    const end = byId('eventEndDate')?.value || '';
    const dates = (byId('eventSpecificDates')?.value || '').split(',').filter(Boolean);
    const parts = [];
    if (range) parts.push(start && end ? `${start}~${end}` : '연속 기간 날짜 미완료');
    if (dates.length) parts.push(`특정 날짜 ${dates.length}개`);
    return parts.join(' / ') || '별도 날짜 없음';
  }

  function collect() {
    return {
      version: 1,
      dateMode: byId('eventDateMode')?.value || 'none',
      range: {
        enabled: byId('eventRangeEnabled')?.value === 'true',
        start: byId('eventStartDate')?.value || '',
        end: byId('eventEndDate')?.value || ''
      },
      specificDates: (byId('eventSpecificDates')?.value || '').split(',').filter(Boolean),
      repeatMode: state.repeatMode,
      weekdays: sortedWeekdays(),
      monthDays: sortedMonthDays(),
      timeSlots: state.timeSlots.map(slot => ({...slot})),
      holidayPolicy: state.holidayPolicy,
      holidayTimeSlots: state.holidayTimeSlots.map(slot => ({...slot})),
      dateTimeOverrides: global.FinsegyeDateTimeOverrides?.collect() || []
    };
  }

  function syncLegacyFields() {
    if (byId('eventRepeat')) byId('eventRepeat').value = state.repeatMode || '';
    if (byId('eventMonthDays')) byId('eventMonthDays').value = sortedMonthDays().join(',');
    if (byId('eventTimeSlots')) byId('eventTimeSlots').value = JSON.stringify(state.timeSlots);
    if (byId('eventHolidayPolicy')) byId('eventHolidayPolicy').value = state.holidayPolicy;
    if (byId('eventHolidayTimeSlots')) byId('eventHolidayTimeSlots').value = JSON.stringify(state.holidayTimeSlots);
    const legacySlot = state.timeSlots[0] || global.FinsegyeDateTimeOverrides?.collect()[0]?.timeSlots?.[0];
    if (byId('eventStartTime')) byId('eventStartTime').value = legacySlot?.start || '';
    if (byId('eventEndTime')) byId('eventEndTime').value = legacySlot?.end || '';
    document.querySelectorAll('input[name="eventWeekday"]').forEach(input => input.remove());
    const form = byId('adApplyForm');
    sortedWeekdays().forEach(day => {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = 'eventWeekday'; input.value = day;
      form?.appendChild(input);
    });
    if (byId('eventSchedulePlan')) byId('eventSchedulePlan').value = JSON.stringify(collect());
  }

  function repeatLabel() {
    if (state.repeatMode === 'none') return '반복 없음';
    if (state.repeatMode === 'daily') return '매일 반복';
    if (state.repeatMode === 'weekly') return `매주 ${sortedWeekdays().join('·') || '요일 미선택'} 반복`;
    if (state.repeatMode === 'monthly') return `매월 ${sortedMonthDays().map(day=>day+'일').join('·') || '날짜 미선택'} 반복`;
    return '반복 주기를 선택해 주세요.';
  }
  function holidayLabel() {
    if (state.holidayPolicy === 'same') return '공휴일에도 동일하게 실행';
    if (state.holidayPolicy === 'exclude') return '법정공휴일·대체공휴일 제외';
    if (state.holidayPolicy === 'custom') return `공휴일 별도 시간: ${prettySlots(state.holidayTimeSlots) || '시간 미선택'}`;
    return '공휴일 처리 방식을 선택해 주세요.';
  }

  function render() {
    const root = byId('eventSchedulePlannerRoot');
    if (!root) return;
    const repeatButtons = [
      ['none','반복 없음'],['daily','매일 반복'],['weekly','매주 반복'],['monthly','매월 반복']
    ].map(([mode,label]) => `<button type="button" class="schedule-choice ${state.repeatMode===mode?'selected':''}" onclick="selectScheduleRepeat('${mode}')">${label}</button>`).join('');
    const weekdays = weekdayOrder.map(day => `<button type="button" class="schedule-choice ${state.weekdays.has(day)?'selected':''}" onclick="toggleScheduleWeekday('${day}')">${day}</button>`).join('');
    const timeRows = state.timeSlots.length ? state.timeSlots.map((slot,index) => `<div class="schedule-row"><span>${esc(slot.start)}~${esc(slot.end)}</span><button type="button" onclick="removeScheduleTimeSlot(${index})">삭제</button></div>`).join('') : '<div class="schedule-empty">선택한 광고 시간대가 없습니다.</div>';
    const holidayRows = state.holidayTimeSlots.length ? state.holidayTimeSlots.map((slot,index) => `<div class="schedule-row"><span>${esc(slot.start)}~${esc(slot.end)}</span><button type="button" onclick="removeScheduleTimeSlot(${index},true)">삭제</button></div>`).join('') : '';
    root.innerHTML = `
      <div class="event-panel schedule-panel">
        <label>반복 주기 선택</label>
        <div class="schedule-grid-four">${repeatButtons}</div>
        ${state.repeatMode==='weekly'?`<div class="schedule-subpanel"><b>반복 요일 선택</b><div class="schedule-grid-seven">${weekdays}</div></div>`:''}
        ${state.repeatMode==='monthly'?`<button type="button" class="digital-picker ${state.monthDays.size?'selected':''}" onclick="openScheduleMonthDays()">${state.monthDays.size?`매월 날짜 ${state.monthDays.size}개 선택`:'매월 날짜 선택'} ▾</button>`:''}
      </div>
      <div class="event-panel schedule-panel">
        <label>하루 광고 시간대</label>
        ${timeRows}
        <button type="button" class="digital-picker ${state.timeSlots.length?'selected':''}" onclick="openScheduleTimeSlot(false)">＋ 광고 시간대 추가</button>
      </div>
      <div class="event-panel schedule-panel">
        <label>공휴일·대체공휴일 처리</label>
        <div class="schedule-grid-three">
          <button type="button" class="schedule-choice ${state.holidayPolicy==='same'?'selected':''}" onclick="selectHolidayPolicy('same')">동일 실행</button>
          <button type="button" class="schedule-choice ${state.holidayPolicy==='exclude'?'selected':''}" onclick="selectHolidayPolicy('exclude')">공휴일 제외</button>
          <button type="button" class="schedule-choice ${state.holidayPolicy==='custom'?'selected':''}" onclick="selectHolidayPolicy('custom')">별도 시간</button>
        </div>
        ${state.holidayPolicy==='custom'?`${holidayRows}<button type="button" class="digital-picker ${state.holidayTimeSlots.length?'selected':''}" onclick="openScheduleTimeSlot(true)">＋ 공휴일 시간대 추가</button>`:''}
      </div>
      <div class="event-panel schedule-summary">
        <b>선택한 광고 일정</b>
        <div>날짜: ${esc(dateSummary())}</div>
        <div>${esc(repeatLabel())}</div>
        <div>시간: ${esc(prettySlots(state.timeSlots) || '미선택')}</div>
        <div>${esc(holidayLabel())}</div>
        <div>날짜별 다른 시간: ${global.FinsegyeDateTimeOverrides?.collect().length || 0}개 날짜</div>
      </div>`;
    syncLegacyFields();
  }

  function addSlot(isHoliday) {
    const start = byId('scheduleSlotStart')?.value || '';
    const end = byId('scheduleSlotEnd')?.value || '';
    if (!start || !end || minutes(end) <= minutes(start)) { alert('종료 시간은 시작 시간보다 뒤로 선택해 주세요.'); return; }
    const target = isHoliday ? state.holidayTimeSlots : state.timeSlots;
    if (target.some(slot => minutes(start) < minutes(slot.end) && minutes(end) > minutes(slot.start))) { alert('이미 선택한 시간대와 겹칩니다.'); return; }
    target.push({start,end});
    target.sort((a,b) => minutes(a.start)-minutes(b.start));
    global.closeEventChoice?.();
    render();
  }

  global.selectScheduleRepeat = function (mode) { state.repeatMode = mode; render(); };
  global.toggleScheduleWeekday = function (day) { state.weekdays.has(day) ? state.weekdays.delete(day) : state.weekdays.add(day); render(); };
  global.openScheduleMonthDays = function () {
    const buttons = Array.from({length:31},(_,i)=>i+1).map(day => `<button type="button" data-plan-monthday="${day}" class="${state.monthDays.has(day)?'selected':''}" onclick="toggleScheduleMonthDay(${day},this)">${day}일</button>`).join('');
    global.openEventChoice?.('매월 반복 날짜 선택', `<div class="choice-grid">${buttons}</div><div id="scheduleMonthDaySummary" class="picker-summary">${sortedMonthDays().map(day=>day+'일').join(' · ') || '날짜를 여러 개 선택할 수 있습니다.'}</div><button type="button" class="choice-done" onclick="finishScheduleMonthDays()">선택 완료</button>`);
  };
  global.toggleScheduleMonthDay = function (day,button) {
    state.monthDays.has(day) ? state.monthDays.delete(day) : state.monthDays.add(day);
    button?.classList.toggle('selected', state.monthDays.has(day));
    if (byId('scheduleMonthDaySummary')) byId('scheduleMonthDaySummary').textContent = sortedMonthDays().map(value=>value+'일').join(' · ') || '날짜를 여러 개 선택할 수 있습니다.';
  };
  global.finishScheduleMonthDays = function () {
    if (!state.monthDays.size) { alert('반복할 날짜를 하나 이상 선택해 주세요.'); return; }
    global.closeEventChoice?.(); render();
  };
  global.openScheduleTimeSlot = function (isHoliday) {
    global.openEventChoice?.(isHoliday?'공휴일 광고 시간 추가':'하루 광고 시간 추가', `<div class="event-grid-two"><div><label>시작 시간</label><select id="scheduleSlotStart">${timeOptions()}</select></div><div><label>종료 시간</label><select id="scheduleSlotEnd">${timeOptions()}</select></div></div><button type="button" class="choice-done" onclick="addScheduleTimeSlot(${Boolean(isHoliday)})">시간대 추가</button>`);
    if (byId('scheduleSlotStart')) byId('scheduleSlotStart').value = '14:00';
    if (byId('scheduleSlotEnd')) byId('scheduleSlotEnd').value = '17:00';
  };
  global.addScheduleTimeSlot = function (isHoliday) { addSlot(Boolean(isHoliday)); };
  global.removeScheduleTimeSlot = function (index,isHoliday) { (isHoliday?state.holidayTimeSlots:state.timeSlots).splice(index,1); render(); };
  global.selectHolidayPolicy = function (policy) { state.holidayPolicy = policy; if (policy !== 'custom') state.holidayTimeSlots = []; render(); };

  function validate() {
    const plan = collect();
    const hasDate = plan.range.enabled || plan.specificDates.length > 0 || plan.dateTimeOverrides.length > 0;
    if (!plan.repeatMode) return {ok:false,message:'반복 주기를 선택해 주세요.'};
    if (plan.repeatMode === 'none' && !hasDate) return {ok:false,message:'연속 기간 또는 특정 날짜를 선택해 주세요.'};
    if (plan.range.enabled && (!plan.range.start || !plan.range.end)) return {ok:false,message:'연속 기간의 시작 날짜와 종료 날짜를 모두 선택해 주세요.'};
    if (plan.range.enabled && plan.range.end < plan.range.start) return {ok:false,message:'종료 날짜는 시작 날짜보다 뒤로 선택해 주세요.'};
    if (plan.repeatMode === 'weekly' && !plan.weekdays.length) return {ok:false,message:'매주 반복할 요일을 하나 이상 선택해 주세요.'};
    if (plan.repeatMode === 'monthly' && !plan.monthDays.length) return {ok:false,message:'매월 반복할 날짜를 하나 이상 선택해 주세요.'};
    const overrideDates = new Set(plan.dateTimeOverrides.map(item => item.date));
    const hasUncoveredSpecificDate = plan.specificDates.some(date => !overrideDates.has(date));
    const needsBaseTime = plan.repeatMode !== 'none' || plan.range.enabled || hasUncoveredSpecificDate;
    if (needsBaseTime && !plan.timeSlots.length) return {ok:false,message:'기본 광고 시간대를 하나 이상 추가해 주세요.'};
    if (!needsBaseTime && !plan.timeSlots.length && !plan.dateTimeOverrides.length) return {ok:false,message:'광고 시간대를 하나 이상 추가해 주세요.'};
    if (!plan.holidayPolicy) return {ok:false,message:'공휴일 처리 방식을 선택해 주세요.'};
    if (plan.holidayPolicy === 'custom' && !plan.holidayTimeSlots.length) return {ok:false,message:'공휴일 광고 시간대를 하나 이상 추가해 주세요.'};
    const overrideValidation = global.FinsegyeDateTimeOverrides?.validate();
    if (overrideValidation && !overrideValidation.ok) return overrideValidation;
    return {ok:true,plan};
  }

  function reset() {
    state.repeatMode=''; state.weekdays.clear(); state.monthDays.clear(); state.timeSlots=[]; state.holidayPolicy=''; state.holidayTimeSlots=[];
    render();
  }

  function installStyles() {
    const style=document.createElement('style');
    style.textContent=`.schedule-panel{margin-top:12px}.schedule-grid-four,.schedule-grid-three,.schedule-grid-seven{display:grid;gap:8px;margin-top:9px}.schedule-grid-four{grid-template-columns:repeat(4,1fr)}.schedule-grid-three{grid-template-columns:repeat(3,1fr)}.schedule-grid-seven{grid-template-columns:repeat(7,1fr)}.schedule-choice{min-height:48px;border:1px solid #00ffcc;border-radius:9px;background:#10231f;color:#fff;font-weight:800}.schedule-choice.selected{background:gold;color:#000;border-color:gold;box-shadow:0 0 0 2px rgba(255,215,0,.22)}.schedule-subpanel{margin-top:12px;padding-top:10px;border-top:1px solid #444}.schedule-row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:10px;border:1px solid #555;border-radius:9px;background:#181818}.schedule-row button{min-width:64px;min-height:38px;border:0;border-radius:7px;background:#8c1325;color:#fff}.schedule-empty{margin-top:8px;color:#aaa}.schedule-summary{margin-top:12px;line-height:1.7;color:#00ffcc}.schedule-summary b{color:gold}.event-choice-card select{width:100%;min-height:52px;background:#050505;color:#fff;border:2px solid gold;border-radius:9px;font-size:18px}@media(max-width:560px){.schedule-grid-four{grid-template-columns:repeat(2,1fr)}.schedule-grid-seven{grid-template-columns:repeat(4,1fr)}.schedule-grid-three{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  const api=Object.freeze({id:'eventSchedulePlanner',title:'월간·주간·일간 광고 일정 플래너',collect,validate,reset,render});
  global.FinsegyeEventSchedulePlanner=api;
  global.FinsegyeModules?.register({id:api.id,title:api.title,file:'event-schedule-planner.js',exports:['collect','validate','reset','render']});
  function install(){installStyles();render();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})(window);
