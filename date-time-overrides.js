(function (global) {
  'use strict';
  const entries = new Map();
  function byId(id){return document.getElementById(id);}
  function mins(value){const [h,m]=value.split(':').map(Number);return h*60+m;}
  function options(){const out=[];for(let h=0;h<24;h+=1)for(const m of [0,30]){const v=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;out.push(`<option value="${v}">${v}</option>`);}return out.join('');}
  function collect(){return Array.from(entries.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([date,slots])=>({date,timeSlots:slots.map(slot=>({...slot}))}));}
  function sync(){if(byId('eventDateTimeOverrides'))byId('eventDateTimeOverrides').value=JSON.stringify(collect());}
  function render(){
    const root=byId('eventDateOverridesRoot');if(!root)return;
    const data=collect();
    const rows=data.length?data.map(item=>`<div class="override-card"><b>${item.date}</b>${item.timeSlots.map((slot,index)=>`<div class="schedule-row"><span>${slot.start}~${slot.end}</span><button type="button" onclick="removeDateTimeOverride('${item.date}',${index})">삭제</button></div>`).join('')}</div>`).join(''):'<div class="schedule-empty">날짜별로 다르게 적용할 시간이 없습니다.</div>';
    root.innerHTML=`<div class="event-panel schedule-panel"><label>날짜별 다른 시간</label><div class="picker-summary">연속 기간이나 기본 일정 중 특정 날짜만 다른 시간으로 운영할 수 있습니다.</div>${rows}<button type="button" class="digital-picker ${data.length?'selected':''}" onclick="openDateTimeOverride()">＋ 날짜별 다른 시간 추가</button></div>`;
    sync();
  }
  global.openDateTimeOverride=function(){global.openEventChoice?.('날짜별 다른 시간 추가',`<div><label>적용 날짜</label><input id="overrideDate" type="date"></div><div class="event-grid-two"><div><label>시작 시간</label><select id="overrideStart">${options()}</select></div><div><label>종료 시간</label><select id="overrideEnd">${options()}</select></div></div><button type="button" class="choice-done" onclick="addDateTimeOverride()">추가</button>`);if(byId('overrideStart'))byId('overrideStart').value='14:00';if(byId('overrideEnd'))byId('overrideEnd').value='17:00';};
  global.addDateTimeOverride=function(){
    const date=byId('overrideDate')?.value||'';const start=byId('overrideStart')?.value||'';const end=byId('overrideEnd')?.value||'';
    if(!date){alert('다른 시간을 적용할 날짜를 선택해 주세요.');return;}
    if(!start||!end||mins(end)<=mins(start)){alert('종료 시간은 시작 시간보다 뒤로 선택해 주세요.');return;}
    const slots=entries.get(date)||[];
    if(slots.some(slot=>mins(start)<mins(slot.end)&&mins(end)>mins(slot.start))){alert('같은 날짜의 기존 시간대와 겹칩니다.');return;}
    slots.push({start,end});slots.sort((a,b)=>mins(a.start)-mins(b.start));entries.set(date,slots);global.closeEventChoice?.();render();global.FinsegyeEventSchedulePlanner?.render();
  };
  global.removeDateTimeOverride=function(date,index){const slots=entries.get(date)||[];slots.splice(index,1);if(slots.length)entries.set(date,slots);else entries.delete(date);render();global.FinsegyeEventSchedulePlanner?.render();};
  function validate(){for(const item of collect())if(!item.date||!item.timeSlots.length)return{ok:false,message:'날짜별 다른 시간 설정을 확인해 주세요.'};return{ok:true};}
  function reset(){entries.clear();render();}
  function styles(){const style=document.createElement('style');style.textContent='.override-card{margin-top:10px;padding:10px;border:1px solid #555;border-radius:10px;background:#151515}.override-card>b{color:gold}.event-choice-card input[type="date"]{width:100%;min-height:52px;box-sizing:border-box;margin:7px 0 12px;background:#050505;color:#fff;border:2px solid gold;border-radius:9px;font-size:18px;color-scheme:dark}';document.head.appendChild(style);}
  const api=Object.freeze({id:'dateTimeOverrides',title:'날짜별 예외 시간',collect,validate,reset,render});global.FinsegyeDateTimeOverrides=api;global.FinsegyeModules?.register({id:api.id,title:api.title,file:'date-time-overrides.js',exports:['collect','validate','reset','render']});
  function install(){styles();render();}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
