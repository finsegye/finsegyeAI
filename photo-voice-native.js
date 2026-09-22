(function (global) {
  'use strict';
  const status = () => document.getElementById('eventMediaStatus');

  function base64ToFile(base64, mime) {
    const bytes = atob(base64);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
    return new File([array], 'finsegye_photo_voice_' + Date.now() + '.m4a', {type:mime || 'audio/mp4'});
  }

  async function acceptConfirmedAudio(file) {
    global.renderPhotoAudioPreview(URL.createObjectURL(file));
    try {
      if (!global.firebaseRef || !global.storage || !global.uploadBytes || !global.getDownloadURL) throw new Error('storage');
      const ref = global.firebaseRef(global.storage, 'audio/' + Date.now() + '_' + file.name);
      await global.uploadBytes(ref, file);
      document.getElementById('shopAdAudio').value = await global.getDownloadURL(ref);
      if (status()) status().textContent = '사진과 확인된 음성 저장 완료';
    } catch (_) {
      if (status()) status().textContent = '사진과 음성 미리보기 완료 · 온라인 저장은 등록할 때 다시 시도합니다.';
    }
  }

  global.FinsegyePhotoVoiceNative = Object.freeze({
    state() {},
    complete(base64, mime) { acceptConfirmedAudio(base64ToFile(base64, mime)); },
    error(message) { if (status()) status().textContent = message; alert(message); }
  });

  global.FinsegyeModules?.register({
    id:'nativePhotoVoice',
    title:'사진 촬영화면 내부 음성 검토 연결',
    file:'photo-voice-native.js',
    exports:['FinsegyePhotoVoiceNative']
  });
})(window);
