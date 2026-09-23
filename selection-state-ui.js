(function (global) {
  'use strict';

  const mediaButtons = Object.freeze({
    image: Object.freeze({
      sample: 'eventImageSampleButton',
      file: 'eventImageFileButton',
      capture: 'eventImageCaptureButton'
    }),
    video: Object.freeze({
      sample: 'eventVideoSampleButton',
      file: 'eventVideoFileButton',
      capture: 'eventVideoCaptureButton'
    })
  });

  function byId(id) { return document.getElementById(id); }
  function setSelected(id, selected) { byId(id)?.classList.toggle('selected', Boolean(selected)); }

  function markField(id) {
    const field = byId(id);
    const display = byId(id + 'Display');
    if (display) display.classList.toggle('selected', Boolean(field?.value));
    else field?.classList.toggle('selected', Boolean(field.value));
  }

  function markMedia(kind, source) {
    const group = mediaButtons[kind];
    if (!group) return;
    Object.entries(group).forEach(([name, id]) => setSelected(id, name === source));
  }

  function clearMedia(kind) {
    const group = mediaButtons[kind];
    if (!group) return;
    Object.values(group).forEach(id => setSelected(id, false));
  }

  function markRepeat() { setSelected('eventRepeatDisplay', true); }

  function reset() {
    ['eventStartDateDisplay', 'eventEndDateDisplay', 'eventStartTimeDisplay',
      'eventEndTimeDisplay', 'eventRepeatDisplay', 'eventAdRange',
      'eventTextSampleButton'].forEach(id => setSelected(id, false));
    clearMedia('image');
    clearMedia('video');
  }

  function wrap(name, after) {
    const original = global[name];
    if (typeof original !== 'function' || original.__selectionStateWrapped) return;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      if (result && typeof result.then === 'function') {
        return result.then(value => { after(args, value); return value; });
      }
      after(args, result);
      return result;
    };
    wrapped.__selectionStateWrapped = true;
    global[name] = wrapped;
  }

  function installStyles() {
    const style = document.createElement('style');
    style.id = 'finsegye-selection-state-style';
    style.textContent = `
      .event-media-actions button.selected,
      .event-media-actions label.selected,
      .event-helper-button.selected,
      select.selected {
        background: gold !important;
        color: #000 !important;
        border-color: gold !important;
        box-shadow: 0 0 0 2px rgba(255,215,0,.22);
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();

    wrap('selectEventTime', args => markField(args[0]));
    wrap('selectTextSample', () => setSelected('eventTextSampleButton', true));
    wrap('selectMediaSample', args => markMedia(args[0], 'sample'));
    wrap('uploadEventMedia', args => {
      const input = byId(args[1] || (args[0] === 'image' ? 'adImageFile' : 'adVideoFile'));
      if (input?.files?.[0]) markMedia(args[0], 'file');
    });
    wrap('handleNativeEventPhotoCapture', args => { if (args[0]?.files?.[0]) markMedia('image', 'capture'); });
    wrap('handleNativeEventVideoCapture', args => { if (args[0]?.files?.[0]) markMedia('video', 'capture'); });
    wrap('removeEventMedia', args => clearMedia(args[0]));
    wrap('finishRepeatPicker', () => {
      const mode = byId('eventRepeat')?.value || 'none';
      const validWeekly = mode !== 'weekly' || document.querySelectorAll('input[name="eventWeekday"]').length > 0;
      const validMonthly = mode !== 'monthly' || Boolean(byId('eventMonthDays')?.value);
      if (validWeekly && validMonthly) markRepeat();
    });
    wrap('setRepeatMode', args => { if (args[0] === 'none' && !args[1]) markRepeat(); });
    wrap('resetAllForms', reset);
    wrap('resetSectionFields', args => { if (args[0] === 'adApplyForm') reset(); });

    byId('eventAdRange')?.addEventListener('change', () => markField('eventAdRange'));
  }

  const api = Object.freeze({
    id: 'selectionStateUi',
    title: '행사 입력 선택 상태 표시',
    markField,
    markMedia,
    clearMedia,
    markRepeat,
    reset
  });

  global.FinsegyeSelectionState = api;
  global.FinsegyeModules?.register({
    id: api.id,
    title: api.title,
    file: 'selection-state-ui.js',
    exports: ['markField', 'markMedia', 'clearMedia', 'markRepeat', 'reset']
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(window);
