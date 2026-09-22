(function (global) {
  'use strict';

  const button = () => document.getElementById('photoAudioButton');
  const status = () => document.getElementById('eventMediaStatus');

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
        setButton('🎙️ 녹음 중… 10초', true);
        if (status()) status().textContent = '사진 설명 음성을 10초 동안 녹음합니다.';
      }
    },
    complete(base64, mime) {
      save(base64ToFile(base64, mime));
    },
    error(message) {
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

  global.FinsegyeModules?.register({
    id: 'nativePhotoVoice',
    title: '사진 설명 10초 음성 녹음',
    file: 'photo-voice-native.js',
    exports: ['recordPhotoVoiceNote']
  });
})(window);
