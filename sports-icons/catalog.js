(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(['preview','stage-empty','ready-count','inventory-progress','refresh','common-grid','extended-grid','load-status','selected-name','selected-english','selected-description','preview-category','stage-resolution','current-source-time','play','replay','previous','next','anchor','timeline','frame-label','speed','fps','loop','circle-guide','duration','source-fps','source-range','audit','export'].map(id => [id, $(id)]));
  const canvas = ui.preview;
  const records = new Map();
  const dataCache = new Map();
  const pendingData = new Map();
  let registry, generation = 0, selectionVersion = 0, selectedId = '', current = null;
  let currentFrame = 0, atAnchor = true, playing = false, playOrigin = 0, originFrame = 0, lastPresent = 0;
  let animationHandle = 0;
  const paths = new Map();
  const frameControls = ['play','replay','previous','next','anchor','timeline','export'];
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const timecode = seconds => {
    if (!Number.isFinite(seconds)) return '—';
    const minute = Math.floor(seconds / 60);
    return `${String(minute).padStart(2,'0')}:${(seconds - minute * 60).toFixed(3).padStart(6,'0')}`;
  };
  const descriptionText = value => Array.isArray(value) ? value.map(descriptionText).filter(Boolean).join('；') : typeof value === 'string' ? value : '';
  const sourceStart = record => Number(record.metadata?.sourceStart ?? record.asset?.sourceStart ?? 0);
  const frameRate = data => Number(data.fps);
  const sourceColor = data => Array.isArray(data.color) ? `rgb(${data.color.slice(0,3).map(v => clamp(Number(v) || 0, 0, 255)).join(',')})` : '#011e60';

  function setEnabled(enabled) { frameControls.forEach(id => ui[id].disabled = !enabled); }
  function stop() {
    playing = false;
    cancelAnimationFrame(animationHandle);
    ui.play.textContent = atAnchor ? '播放完整动作' : current && currentFrame === current.frames.length - 1 ? '重新播放完整动作' : '继续播放';
  }
  function updateInventory() {
    const ready = [...records.values()].filter(record => record.state === 'ready').length;
    ui['ready-count'].replaceChildren(document.createTextNode(String(ready)), Object.assign(document.createElement('span'), {textContent:` / ${registry?.icons.length || 18}`}));
    ui['inventory-progress'].style.width = `${100 * ready / (registry?.icons.length || 18)}%`;
    const working = [...records.values()].filter(record => record.state === 'loading').length;
    const errors = [...records.values()].filter(record => record.state === 'error').length;
    ui['load-status'].textContent = working ? `正在检查素材 · ${ready} 项可预览，${working} 项读取中` : `${ready} 项可预览 · ${(registry?.icons.length || 18) - ready} 项待交付${errors ? `（含 ${errors} 项资源待检查）` : ''}`;
  }
  function updateCard(record) {
    record.button.disabled = record.state !== 'ready';
    record.status.dataset.state = record.state;
    record.status.textContent = ({pending:'制作中',loading:'读取中',ready:'可预览',error:'待检查'})[record.state];
    record.button.title = record.error || `${record.definition.name} · ${record.status.textContent}`;
    record.placeholder.hidden = record.state === 'ready';
  }
  function buildCards() {
    ui['common-grid'].replaceChildren(); ui['extended-grid'].replaceChildren();
    records.clear();
    registry.icons.forEach(definition => {
      const button = document.createElement('button');
      button.className = 'icon-card'; button.type = 'button'; button.disabled = true;
      button.setAttribute('aria-label', `${definition.name}图标`);
      button.setAttribute('aria-pressed', 'false');
      const art = Object.assign(document.createElement('div'), {className:'card-art'});
      const thumbnail = document.createElement('canvas'); thumbnail.width = 360; thumbnail.height = 254; thumbnail.setAttribute('aria-hidden','true');
      const placeholder = Object.assign(document.createElement('span'), {className:'card-empty', textContent:'···'});
      art.append(thumbnail, placeholder);
      const bottom = Object.assign(document.createElement('div'), {className:'card-bottom'});
      const text = document.createElement('span');
      text.append(Object.assign(document.createElement('span'), {className:'card-name', textContent:definition.name}), Object.assign(document.createElement('span'), {className:'card-english', textContent:definition.english}));
      const status = Object.assign(document.createElement('span'), {className:'card-state'});
      bottom.append(text,status); button.append(art,bottom);
      const record = {definition, button, thumbnail, placeholder, status, state:'pending', metadata:null, dataUrl:null, anchorPath:null};
      records.set(definition.id,record); updateCard(record);
      button.addEventListener('click', () => selectIcon(definition.id));
      ui[definition.category === 'extended' ? 'extended-grid' : 'common-grid'].append(button);
    });
  }
  function validateData(data, metadata) {
    if (!data || !Array.isArray(data.frames) || !data.frames.length || !Number.isFinite(Number(data.fps)) || Number(data.fps) <= 0) throw new Error('帧数据或帧率无效');
    if (metadata.frameCount && data.frames.length !== Number(metadata.frameCount)) throw new Error('清单与实际帧数不一致');
    if (data.frames.some(frame => !frame || typeof frame.path !== 'string')) throw new Error('源帧轮廓数据不完整');
    if (!data.frames.some(frame => frame.path.length)) throw new Error('尚未提供可见轮廓');
    data.width = Number(data.width) || 960; data.height = Number(data.height) || 960;
    if (data.width <= 0 || data.height <= 0) throw new Error('源画布尺寸无效');
    const anchor = Number(data.anchor ?? metadata.anchor ?? 0);
    data.anchor = Number.isInteger(anchor) ? clamp(anchor,0,data.frames.length - 1) : 0;
    if (!data.frames[data.anchor].path) data.anchor = data.frames.findIndex(frame => frame.path.length);
    // Parse the delivered anchor before calling an item previewable.
    new Path2D(data.frames[data.anchor].path);
    return data;
  }
  function cacheData(id, data) {
    dataCache.delete(id); dataCache.set(id,data);
    while (dataCache.size > 3) {
      const removable = [...dataCache.keys()].find(key => key !== selectedId);
      if (!removable) break;
      dataCache.delete(removable);
    }
  }
  async function loadData(record, epoch) {
    const id = record.definition.id;
    if (dataCache.has(id)) { const data = dataCache.get(id); cacheData(id,data); return data; }
    if (pendingData.has(id)) return pendingData.get(id);
    const pending = (async () => {
      const response = await fetch(record.dataUrl, {cache:'no-store'});
      if (!response.ok) throw new Error(`素材尚不可读（HTTP ${response.status}）`);
      const data = validateData(await response.json(),record.metadata);
      if (epoch === generation) cacheData(id,data);
      return data;
    })();
    pendingData.set(id,pending);
    try { return await pending; } finally { if (pendingData.get(id) === pending) pendingData.delete(id); }
  }
  function draw(target, data, index, guide = false, suppliedPath = null) {
    const ctx = target.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,target.width,target.height); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,target.width,target.height);
    const scale = Math.min(target.width / data.width, target.height / data.height);
    const left = (target.width - data.width * scale) / 2, top = (target.height - data.height * scale) / 2;
    ctx.translate(left,top); ctx.scale(scale,scale);
    if (guide) {
      ctx.beginPath(); ctx.arc(data.width / 2,data.height / 2,Math.min(data.width,data.height) * .46875,0,Math.PI * 2);
      ctx.strokeStyle = '#e3e7ef'; ctx.lineWidth = 2; ctx.setLineDash([5,7]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (data.frames[index]?.path) { ctx.fillStyle = sourceColor(data); ctx.fill(suppliedPath || new Path2D(data.frames[index].path),'evenodd'); }
    ctx.setTransform(1,0,0,1,0,0);
  }
  function showFrame(index) {
    if (!current) return;
    currentFrame = clamp(Math.floor(index),0,current.frames.length - 1);
    if (!paths.has(currentFrame)) paths.set(currentFrame,new Path2D(current.frames[currentFrame].path));
    draw(canvas,current,currentFrame,ui['circle-guide'].checked,paths.get(currentFrame));
    ui.timeline.value = currentFrame;
    ui['frame-label'].textContent = `${String(currentFrame + 1).padStart(3,'0')} / ${current.frames.length}`;
    const record = records.get(selectedId);
    ui['current-source-time'].textContent = `原片 ${timecode(sourceStart(record) + currentFrame / frameRate(current))}`;
  }
  async function selectIcon(id) {
    const record = records.get(id); if (!record || record.state !== 'ready') return;
    const version = ++selectionVersion;
    stop(); selectedId = id; current = null; paths.clear(); setEnabled(false);
    records.forEach(item => { const selected = item === record; item.button.classList.toggle('selected', selected); item.button.setAttribute('aria-pressed',String(selected)); });
    ui['selected-name'].textContent = record.definition.name;
    ui['selected-english'].textContent = record.definition.english.toUpperCase();
    ui['selected-description'].textContent = '正在读取完整源帧…';
    ui['stage-empty'].hidden = false;
    try {
      const data = await loadData(record,generation);
      if (version !== selectionVersion) return;
      current = data; record.asset = {sourceStart:data.sourceStart}; atAnchor = true; ui['stage-empty'].hidden = true; setEnabled(true);
      ui['preview-category'].textContent = `${record.definition.category === 'extended' ? '拓展' : '常用'}运动 · 完整动作`;
      const notes = descriptionText(record.metadata.notes);
      ui['selected-description'].textContent = /[\u3400-\u9fff]/.test(notes) ? notes : '完整保留原片入场、运动与退场。可暂停并逐帧检查，再导出任意帧用于二次创作。';
      ui['stage-resolution'].textContent = `${data.width} × ${data.height} 原片坐标 · 等比显示`;
      ui.timeline.max = data.frames.length - 1;
      ui.duration.textContent = `${(data.frames.length / frameRate(data)).toFixed(2)} s`;
      ui['source-fps'].textContent = `${frameRate(data).toFixed(2)} FPS / ${data.frames.length} 帧`;
      const end = Number(record.metadata.sourceEnd ?? (sourceStart(record) + data.frames.length / frameRate(data)));
      ui['source-range'].textContent = `${timecode(sourceStart(record))} – ${timecode(end)}`;
      ui.audit.replaceChildren();
      if (record.metadata.auditPath) {
        const link = document.createElement('a'); link.href = new URL(record.metadata.auditPath,record.manifestUrl).href; link.textContent = '查看审计文件 ↗'; link.target = '_blank'; link.rel = 'noopener'; ui.audit.append(link);
      } else ui.audit.textContent = '尚未提供审计文件';
      showFrame(data.anchor); stop();
    } catch (error) {
      if (version !== selectionVersion) return;
      record.state = 'error'; record.error = error.message; updateCard(record); updateInventory();
      ui['selected-description'].textContent = `素材暂时无法读取：${error.message}。可使用「刷新素材」重试。`;
    }
  }
  function tick(now) {
    if (!playing || !current) return;
    const rate = frameRate(current), speed = Number(ui.speed.value);
    const frame = originFrame + (now - playOrigin) / 1000 * rate * speed;
    if (frame >= current.frames.length) {
      if (ui.loop.checked) {
        originFrame = frame % current.frames.length; playOrigin = now; showFrame(Math.floor(originFrame));
      } else { showFrame(current.frames.length - 1); stop(); return; }
    } else {
      const presentationRate = ui.fps.value === 'source' ? rate : Number(ui.fps.value);
      if (now - lastPresent >= 1000 / presentationRate - .5) { showFrame(Math.floor(frame)); lastPresent = now; }
    }
    animationHandle = requestAnimationFrame(tick);
  }
  function play(fromStart = false) {
    if (!current) return;
    cancelAnimationFrame(animationHandle);
    if (fromStart || atAnchor || currentFrame === current.frames.length - 1) showFrame(0);
    atAnchor = false; originFrame = currentFrame; playOrigin = performance.now(); lastPresent = 0; playing = true;
    ui.play.textContent = '暂停'; animationHandle = requestAnimationFrame(tick);
  }
  function step(delta) { if (!current) return; atAnchor = false; stop(); showFrame(currentFrame + delta); stop(); }
  async function refresh() {
    const epoch = ++generation; ++selectionVersion; stop(); selectedId = ''; current = null; paths.clear(); dataCache.clear(); pendingData.clear();
    setEnabled(false); ui.refresh.disabled = true; ui['stage-empty'].hidden = false;
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    ui['selected-name'].textContent = '选择运动'; ui['selected-english'].textContent = 'SELECT A SPORT';
    ui['selected-description'].textContent = '正在读取两组素材交付清单。';
    for (const id of ['duration','source-fps','source-range','audit','frame-label']) ui[id].textContent = '—';
    ui['current-source-time'].textContent = '原片 —';
    try {
      const response = await fetch('catalog.json',{cache:'no-store'});
      if (!response.ok) throw new Error('素材目录不可读');
      registry = await response.json();
      if (!Array.isArray(registry.icons) || !Array.isArray(registry.manifests)) throw new Error('素材目录结构无效');
      buildCards(); updateInventory();
      const manifests = await Promise.allSettled(registry.manifests.map(async path => {
        const url = new URL(path,location.href);
        const response = await fetch(url,{cache:'no-store'});
        if (!response.ok) throw new Error(`清单尚未交付：${path}`);
        const manifest = await response.json();
        if (!Array.isArray(manifest.icons)) throw new Error(`清单结构待检查：${path}`);
        return {url,manifest};
      }));
      if (epoch !== generation) return;
      manifests.forEach(result => {
        if (result.status !== 'fulfilled') return;
        const {url,manifest} = result.value;
        manifest.icons.forEach(metadata => {
          const record = records.get(metadata.id);
          if (!record || record.definition.group !== manifest.group || typeof metadata.dataUrl !== 'string' || !metadata.dataUrl) return;
          record.metadata = metadata; record.manifestUrl = url.href; record.dataUrl = new URL(metadata.dataUrl,url).href; record.state = 'loading'; updateCard(record);
        });
      });
      updateInventory();
      const queue = [...records.values()].filter(record => record.state === 'loading');
      async function worker() {
        while (queue.length && epoch === generation) {
          const record = queue.shift();
          try {
            const data = await loadData(record,epoch);
            if (epoch !== generation) return;
            record.anchorPath = new Path2D(data.frames[data.anchor].path);
            draw(record.thumbnail,data,data.anchor,false,record.anchorPath);
            record.state = 'ready'; updateCard(record); updateInventory();
            if (!selectedId) await selectIcon(record.definition.id);
          } catch (error) {
            if (epoch !== generation) return;
            record.state = 'error'; record.error = error.message; updateCard(record); updateInventory();
          }
        }
      }
      await Promise.all([worker(),worker()]);
      if (epoch !== generation) return;
      updateInventory();
      if (!selectedId) ui['selected-description'].textContent = '素材正在制作。交付后点击「刷新素材」，即可在这里查看完整动作。';
    } catch (error) {
      if (epoch === generation) { ui['load-status'].textContent = `目录加载失败：${error.message}`; ui['selected-description'].textContent = '请通过本地预览服务器打开本页，并刷新重试。'; }
    } finally { if (epoch === generation) ui.refresh.disabled = false; }
  }
  ui.refresh.addEventListener('click',refresh);
  ui.play.addEventListener('click',() => playing ? stop() : play());
  ui.replay.addEventListener('click',() => play(true));
  ui.previous.addEventListener('click',() => step(-1));
  ui.next.addEventListener('click',() => step(1));
  ui.anchor.addEventListener('click',() => { if (!current) return; atAnchor = true; stop(); showFrame(current.anchor); });
  ui.timeline.addEventListener('input',() => { atAnchor = false; stop(); showFrame(Number(ui.timeline.value)); stop(); });
  ui['circle-guide'].addEventListener('change',() => showFrame(currentFrame));
  ui.speed.addEventListener('change',() => { if (playing) { originFrame = currentFrame; playOrigin = performance.now(); } });
  ui.export.addEventListener('click',() => {
    if (!current) return;
    const record = records.get(selectedId);
    const root = document.createElementNS('http://www.w3.org/2000/svg','svg');
    root.setAttribute('xmlns','http://www.w3.org/2000/svg'); root.setAttribute('viewBox',`0 0 ${current.width} ${current.height}`); root.setAttribute('width',String(current.width)); root.setAttribute('height',String(current.height));
    const title = document.createElementNS(root.namespaceURI,'title'); title.textContent = `${record.definition.name} · 源帧 ${currentFrame + 1} · ${timecode(sourceStart(record) + currentFrame / frameRate(current))}`;
    const path = document.createElementNS(root.namespaceURI,'path'); path.setAttribute('d',current.frames[currentFrame].path); path.setAttribute('fill',sourceColor(current)); path.setAttribute('fill-rule','evenodd'); root.append(title,path);
    const blob = new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `${selectedId}-frame-${String(currentFrame + 1).padStart(3,'0')}.svg`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden && playing) stop(); });
  refresh();
})();
