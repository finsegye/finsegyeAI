(function (global) {
  'use strict';

  const button = () => document.getElementById('photoAudioButton');
  const status = () => document.getElementById('eventMediaStatus');
  let timer = 0;
  let startedAt = 0;

  function progress(seconds) {
    const value = Math.max(0, Math.min(10, seconds));
    const bar = document.getElementById('photoAudioProgressBar');
    const label = document.getElementById('photoAudioElapsed');
    if (bar) bar.value = value;
    if (label) label.textContent = '00:' + String(value).padStart(2, '0') + ' / 00:10';
  }

  function stopTimer() {
    clearInterval(timer);
    timer = 0;
    const stop = document.getElementById('photoAudioStopButton');
    if (stop) stop.hidden = true;
  }

  function startTimer() {
    stopTimer();
    startedAt = Date.now();
    progress(0);
    const stop = document.getElementById('photoAudioStopButton');
    if (stop) stop.hidden = false;
    timer = setInterval(() => {
      const elapsed = Math.min(10, Math.floor((Date.now() - startedAt) / 1000));
      progress(elapsed);
      if (elapsed >= 10) stopTimer();
    }, 200);
  }

  function setButton(text, disabled) {
    const el = button();
    if (!el) return;
    el.textContent = text;
    el.disabled = !!disabled;
  }

  function base64ToFile(base64, mime) {
    const bytes = atob(base64);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
    return new File([array], 'finsegye_photo_voice_' + Date.now() + '.m4a', { type: mime || 'audio/mp4' });
  }

  async function save(file) {
    const localUrl = URL.createObjectURL(file);
    global.renderPhotoAudioPreview(localUrl);
    try {
      if (!global.firebaseRef || !global.storage || !global.uploadBytes || !global.getDownloadURL) {
        throw new Error('온라인 저장소 연결을 확인해 주세요.');
      }
      const ref = global.firebaseRef(global.storage, 'audio/' + Date.now() + '_' + file.name);
      await global.uploadBytes(ref, file);
      document.getElementById('shopAdAudio').value = await global.getDownloadURL(ref);
      if (status()) status().textContent = '사진 설명 음성 저장 완료';
    } catch (error) {
      if (status()) status().textContent = '음성 미리보기는 완료됐지만 온라인 저장에 실패했습니다.';
    } finally {
      setButton('🎙️ 사진 설명 10초 녹음', false);
    }
  }

  global.FinsegyePhotoVoiceNative = Object.freeze({
    state(value) {
      if (value === 'recording') {
        startTimer();
        setButton('● 녹음 중', true);
        if (status()) status().textContent = '사진 설명 음성을 녹음하고 있습니다.';
      }
    },
    complete(base64, mime) {
      stopTimer();
      progress(Math.min(10, Math.max(1, Math.round((Date.now() - startedAt) / 1000))));
      save(base64ToFile(base64, mime));
    },
    error(message) {
      stopTimer();
      setButton('🎙️ 사진 설명 10초 녹음', false);
      if (status()) status().textContent = message;
      alert(message);
    }
  });

  global.recordPhotoVoiceNote = function () {
    const imageValue = document.getElementById('shopAdImage');
    const imagePreview = document.querySelector('.event-media-item[data-kind="image"]');
    if ((!imageValue || !imageValue.value) && !imagePreview) {
      alert('먼저 행사 사진을 촬영하거나 선택해 주세요.');
      return;
    }
    if (!global.Android || typeof global.Android.startPhotoVoiceRecording !== 'function') {
      alert('사진 음성 녹음 모듈을 사용할 수 없습니다. 핀세계 앱을 최신 버전으로 실행해 주세요.');
      return;
    }
    setButton('🎙️ 마이크 준비 중…', true);
    if (status()) status().textContent = '상시 음성대기를 중지하고 녹음을 준비합니다.';
    global.Android.startPhotoVoiceRecording();
  };

  global.stopPhotoVoiceNote = function () {
    if (global.Android && typeof global.Android.stopPhotoVoiceRecording === 'function') {
      global.Android.stopPhotoVoiceRecording();
      if (status()) status().textContent = '녹음을 마치고 저장하고 있습니다.';
    }
  };

  global.FinsegyeModules?.register({
    id: 'nativePhotoVoice',
    title: '사진 설명 10초 음성 녹음',
    file: 'photo-voice-native.js',
    exports: ['recordPhotoVoiceNote']
  });
})(window);
