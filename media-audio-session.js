(function (global) {
  'use strict';

  let activeCount = 0;
  let resumeTimer = 0;

  function androidCall(name) {
    try {
      if (global.Android && typeof global.Android[name] === 'function') global.Android[name]();
    } catch (_) {}
  }

  function begin() {
    clearTimeout(resumeTimer);
    activeCount += 1;
    if (activeCount === 1) androidCall('pauseVoiceForMedia');
  }

  function end() {
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount !== 0) return;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => androidCall('resumeVoiceAfterMedia'), 1200);
  }

  function bind(media) {
    if (!media || media.dataset.finsegyeAudioSessionBound === '1') return;
    media.dataset.finsegyeAudioSessionBound = '1';
    let held = false;
    media.addEventListener('play', () => { if (!held) { held = true; begin(); } });
    const release = () => { if (held) { held = false; end(); } };
    media.addEventListener('pause', release);
    media.addEventListener('ended', release);
    media.addEventListener('error', release);
  }

  const observer = new MutationObserver(records => records.forEach(record =>
    record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches('audio,video')) bind(node);
      node.querySelectorAll('audio,video').forEach(bind);
    })
  ));

  function install() {
    document.querySelectorAll('audio,video').forEach(bind);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  global.FinsegyeMediaAudioSession = Object.freeze({ begin, end, bind });
  global.FinsegyeModules?.register({
    id: 'mediaAudioSession',
    title: '공통 미디어 오디오 세션',
    file: 'media-audio-session.js',
    exports: ['FinsegyeMediaAudioSession']
  });
})(window);
