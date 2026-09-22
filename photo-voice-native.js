(function (global) {
  'use strict';
  let timer = 0;
  let startedAt = 0;

  const status = () => document.getElementById('eventMediaStatus');
  const imageItem = () => document.querySelector('.event-media-item[data-kind="image"]');

  function ensureOverlay() {
    const item = imageItem();
    if (!item) return null;
    let box = item.querySelector('.photo-voice-overlay');
    if (box) return box;
    box = document.createElement('div');
    box.className = 'photo-voice-overlay';
    box.innerHTML = '<button type="button" data-action="start">🎙️ 사진 설명 녹음</button>' +
      '<div data-role="recording" hidden><div data-role="time">● 00:00 / 00:10</div>' +
      '<progress max="10" value="0"></progress><button type="button" data-action="stop">녹음 완료</button></div>';
    box.querySelector('[data-action="start"]').onclick = () => global.recordPhotoVoiceNote();
    box.querySelector('[data-action="stop"]').onclick = () => global.stopPhotoVoiceNote();
    item.appendChild(box);
    return box;
  }

  function showRecording(show) {
    const box = ensureOverlay();
    if (!box) return;
    box.querySelector('[data-action="start"]').hidden = show;
    box.querySelector('[data-role="recording"]').hidden = !show;
  }

  function update(seconds) {
    const box = ensureOverlay();
    if (!box) return;
    const value = Math.max(0, Math.min(10, seconds));
    box.querySelector('progress').value = value;
    box.querySelector('[data-role="time"]').textContent = '● 00:' + String(value).padStart(2, '0') + ' / 00:10';
  }

  function stopTimer() { clearInterval(timer); timer = 0; }
  function startTimer() {
    stopTimer();
    startedAt = Date.now();
    showRecording(true);
    update(0);
    timer = setInterval(() => {
      const elapsed = Math.min(10, Math.floor((Date.now() - startedAt) / 1000));
      update(elapsed);
      if (elapsed >= 10) stopTimer();
    }, 200);
  }

  function base64ToFile(base64, mime) {
    const bytes = atob(base64);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
    return new File([array], 'finsegye_photo_voice_' + Date.now() + '.m4a', {type:mime || 'audio/mp4'});
  }

  async function save(file) {
    global.renderPhotoAudioPreview(URL.createObjectURL(file));
    try {
      if (!global.firebaseRef || !global.storage || !global.uploadBytes || !global.getDownloadURL) throw new Error('storage');
      const ref = global.firebaseRef(global.storage, 'audio/' + Date.now() + '_' + file.name);
      await global.uploadBytes(ref, file);
      document.getElementById('shopAdAudio').value = await global.getDownloadURL(ref);
      if (status()) status().textContent = '사진 설명 음성 저장 완료';
    } catch (_) {
      if (status()) status().textContent = '음성 미리보기는 완료됐지만 온라인 저장에 실패했습니다.';
    } finally {
      showRecording(false);
    }
  }

  global.FinsegyePhotoVoiceNative = Object.freeze({
    state(value) {
      if (value === 'recording') {
        startTimer();
        if (status()) status().textContent = '사진 설명 음성을 녹음하고 있습니다.';
      }
    },
    complete(base64, mime) {
      stopTimer();
      update(Math.min(10, Math.max(1, Math.round((Date.now() - startedAt) / 1000))));
      save(base64ToFile(base64, mime));
    },
    error(message) {
      stopTimer();
      showRecording(false);
      if (status()) status().textContent = message;
      alert(message);
    }
  });

  global.recordPhotoVoiceNote = function () {
    if (!imageItem()) { alert('먼저 행사 사진을 촬영하거나 선택해 주세요.'); return; }
    if (!global.Android || typeof global.Android.startPhotoVoiceRecording !== 'function') {
      alert('사진 음성 녹음 모듈을 사용할 수 없습니다.'); return;
    }
    if (status()) status().textContent = '마이크를 준비하고 있습니다.';
    global.Android.startPhotoVoiceRecording();
  };

  global.stopPhotoVoiceNote = function () {
    if (global.Android && typeof global.Android.stopPhotoVoiceRecording === 'function') {
      global.Android.stopPhotoVoiceRecording();
      if (status()) status().textContent = '녹음을 저장하고 있습니다.';
    }
  };

  new MutationObserver(() => ensureOverlay()).observe(document.documentElement, {childList:true, subtree:true});
  if (document.readyState !== 'loading') ensureOverlay();
  else document.addEventListener('DOMContentLoaded', ensureOverlay, {once:true});

  global.FinsegyeModules?.register({id:'nativePhotoVoice', title:'사진 화면 내부 음성 녹음', file:'photo-voice-native.js', exports:['recordPhotoVoiceNote']});
})(window);
