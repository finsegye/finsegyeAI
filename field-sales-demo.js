(function (global) {
  'use strict';
  const MODULE_ID = 'field-sales-demo-v14.13.2';
  const LIVE_ROOT = 'https://finsegye.github.io/finsegyeAI/';
  const state = { mediaUrls: [], campaignUrl: '' };
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const byId = id => document.getElementById(id);

  function mount() {
    if (byId('fsdLaunch')) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet'; style.href = 'field-sales-demo.css?v=14.13.2';
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', `
      <button id="fsdLaunch" class="fsd-launch" type="button">✨ 매장 현장 시연</button>
      <div id="fsdBackdrop" class="fsd-backdrop" role="dialog" aria-modal="true" aria-label="매장 광고 현장 시연">
        <div class="fsd-panel">
          <header class="fsd-head"><div><div class="fsd-help">핀세계 영업용 독립 모듈</div><h2>QR 즉시 광고 시연</h2></div><button id="fsdClose" class="fsd-close" type="button">×</button></header>
          <div class="fsd-steps"><div class="fsd-step on">1 광고 입력</div><div class="fsd-step">2 자동 제작</div><div class="fsd-step">3 사장님 확인</div></div>
          <div id="fsdForm" class="fsd-form">
            <label class="fsd-label">매장 이름<input id="fsdStore" class="fsd-input" maxlength="40" placeholder="예: 전주 행복식당"></label>
            <label class="fsd-label">광고 제목<input id="fsdTitle" class="fsd-input" maxlength="60" placeholder="예: 오늘 오후 2시~5시 특별 혜택"></label>
            <label class="fsd-label">혜택 내용<textarea id="fsdBenefit" class="fsd-textarea" maxlength="220" placeholder="예: 핀세계 광고를 보고 방문하면 음료 1잔 무료"></textarea></label>
            <div class="fsd-row">
              <label class="fsd-label">전화번호<input id="fsdPhone" class="fsd-input" inputmode="tel" placeholder="063-000-0000"></label>
              <label class="fsd-label">주소<input id="fsdAddress" class="fsd-input" placeholder="전주시 ○○로 00"></label>
            </div>
            <div class="fsd-row">
              <label class="fsd-file fsd-label">매장 사진 선택<input id="fsdPhoto" type="file" accept="image/*" capture="environment"></label>
              <label class="fsd-file fsd-label">광고 동영상 선택<input id="fsdVideo" type="file" accept="video/*" capture="environment"></label>
            </div>
            <div class="fsd-help">사진 또는 동영상 하나만 있어도 됩니다. 둘 다 선택하면 동영상과 사진이 함께 표시됩니다.</div>
            <div class="fsd-actions"><button id="fsdSample" class="fsd-btn secondary" type="button">샘플 자동 입력</button><button id="fsdCreate" class="fsd-btn primary" type="button">광고 만들고 QR 생성</button></div>
            <div id="fsdProgress" class="fsd-progress"></div>
          </div>
          <div id="fsdResult" class="fsd-result">
            <h3>사장님 스마트폰으로 스캔하세요</h3>
            <div class="fsd-note">카메라로 QR을 비추면 설치 없이 사진·동영상 광고가 바로 열립니다.</div>
            <img id="fsdQr" class="fsd-qr" alt="광고 확인 QR 코드">
            <div id="fsdUrl" class="fsd-url"></div>
            <div class="fsd-actions"><button id="fsdPreview" class="fsd-btn secondary" type="button">이 스마트폰에서 열기</button><button id="fsdShare" class="fsd-btn primary" type="button">다른 폰으로 주소 공유</button></div>
            <button id="fsdAgain" class="fsd-btn secondary" style="width:100%;margin-top:10px" type="button">다른 광고 만들기</button>
          </div>
        </div></div>`);
    bind();
  }

  function bind() {
    byId('fsdLaunch').onclick = () => byId('fsdBackdrop').classList.add('on');
    byId('fsdClose').onclick = () => byId('fsdBackdrop').classList.remove('on');
    byId('fsdBackdrop').addEventListener('click', e => { if (e.target === byId('fsdBackdrop')) byId('fsdBackdrop').classList.remove('on'); });
    byId('fsdSample').onclick = fillSample;
    byId('fsdCreate').onclick = createCampaign;
    byId('fsdAgain').onclick = reset;
    byId('fsdPreview').onclick = () => { if (state.campaignUrl) global.open(state.campaignUrl, '_blank'); };
    byId('fsdShare').onclick = share;
  }

  function fillSample() {
    byId('fsdStore').value = '우리동네 행복식당';
    byId('fsdTitle').value = '오늘 오후 2시~5시 빈자리 특별 혜택';
    byId('fsdBenefit').value = '이 화면을 보여주시면 음료 1잔을 무료로 드립니다. 오늘만 이용할 수 있습니다.';
    byId('fsdPhone').value = '063-000-0000';
    byId('fsdAddress').value = '전북특별자치도 전주시 우리동네 1번길';
  }

  function setProgress(message, busy) {
    const box = byId('fsdProgress'); box.textContent = message; box.classList.toggle('on', Boolean(message));
    byId('fsdCreate').disabled = Boolean(busy); byId('fsdSample').disabled = Boolean(busy);
  }

  async function firebase() {
    if (!global.finsegyeFirebaseReady) throw new Error('인터넷 연결 또는 Firebase 준비 상태를 확인해 주세요.');
    await global.finsegyeFirebaseReady;
    if (!global.storage || !global.firebaseRef || !global.uploadBytes || !global.getDownloadURL) throw new Error('광고 저장 기능을 준비하지 못했습니다.');
  }

  async function upload(file, folder) {
    if (!file) return '';
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `field-sales/${folder}/${Date.now()}_${Math.random().toString(36).slice(2,9)}_${safe}`;
    const target = global.firebaseRef(global.storage, path);
    await global.uploadBytes(target, file, {contentType:file.type || 'application/octet-stream'});
    return global.getDownloadURL(target);
  }

  function encodePayload(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function viewerRoot() {
    return LIVE_ROOT + 'field-sales-view.html';
  }

  async function createCampaign() {
    const store = byId('fsdStore').value.trim();
    const title = byId('fsdTitle').value.trim();
    const benefit = byId('fsdBenefit').value.trim();
    if (!store || !title || !benefit) { alert('매장 이름, 광고 제목, 혜택 내용을 입력해 주세요.'); return; }
    try {
      setProgress('1/3 사진·동영상을 안전하게 올리고 있습니다…', true);
      await firebase();
      const [photoUrl, videoUrl] = await Promise.all([
        upload(byId('fsdPhoto').files[0], 'photos'), upload(byId('fsdVideo').files[0], 'videos')
      ]);
      setProgress('2/2 카카오톡에서도 열리는 광고 주소를 만들고 있습니다…', true);
      const payload = {
        version:'14.13.2', id:`FSD-${Date.now().toString(36).toUpperCase()}`, createdAt:new Date().toISOString(),
        store, title, benefit, phone:byId('fsdPhone').value.trim(), address:byId('fsdAddress').value.trim(),
        photoUrl, videoUrl, provider:'핀세계', badge:'현장 시연 광고 · 실제 발송 아님'
      };
      state.campaignUrl = viewerRoot() + '#data=' + encodePayload(payload);
      setProgress('QR 코드를 완성했습니다.', false);
      byId('fsdQr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=10&data=' + encodeURIComponent(state.campaignUrl);
      byId('fsdUrl').textContent = state.campaignUrl;
      byId('fsdForm').style.display = 'none'; byId('fsdResult').classList.add('on');
      document.querySelectorAll('.fsd-step').forEach(el => el.classList.add('on'));
    } catch (error) {
      console.error(error); setProgress('', false); alert('QR 광고 생성 실패: ' + (error.message || error));
    }
  }

  function reset() {
    state.campaignUrl = ''; byId('fsdResult').classList.remove('on'); byId('fsdForm').style.display = 'grid';
    document.querySelectorAll('.fsd-step').forEach((el,i) => el.classList.toggle('on', i === 0)); setProgress('', false);
  }

  async function share() {
    if (!state.campaignUrl) return;
    const data = {title:'핀세계 매장 광고 확인', text:'매장 광고 시안을 확인해 주세요.', url:state.campaignUrl};
    if (navigator.share) { try { await navigator.share(data); return; } catch (_) {} }
    await navigator.clipboard.writeText(state.campaignUrl); alert('광고 주소를 복사했습니다.');
  }

  global.FinsegyeFieldSalesDemo = Object.freeze({id:MODULE_ID, open(){ byId('fsdBackdrop')?.classList.add('on'); }, reset});
  global.FinsegyeModules?.register?.({id:MODULE_ID,title:'매장 현장 QR 광고 시연',file:'field-sales-demo.js',exports:['open','reset']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})(window);
