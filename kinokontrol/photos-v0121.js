'use strict';
const categories=[['general','Общий вид'],['scheme','Схема'],['defects','Нарушения'],['thermal','Тепловизионная съёмка']];
let photoView='inbox', photoSourcesOpen=false;
let editingPhotoFindingId='';

const isCategory=k=>categories.some(([id])=>id===k);
const validPhoto=s=>/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s||'');
const photoSrc=x=>validPhoto(x.marked)?x.marked:(validPhoto(x.data)?x.data:'');
function photoCategory(x){
  if(x.category==='inbox'||isCategory(x.category))return x.category;
  if(x.type==='thermal')return 'thermal';
  const s=String((x.comment||'')+' '+(x.name||'')).toLowerCase();
  if(/схем|scheme|diagram|маркировк|документац/.test(s))return 'scheme';
  return /наруш|дефект|поврежд|оголен|оголён|неисправ|перегрев|обуг/.test(s)?'defects':'general';
}
const categoryOptions=(selected)=>[['inbox','Не разобрано'],...categories].map(([k,l])=>'<option value="'+k+'" '+(selected===k?'selected':'')+'>'+html(l)+'</option>').join('');
function renderPhotos(){
  const entries=boardEntries();
  const board=entries.find(({h,p})=>h.id+'|'+p.id===selectedPhotoHall)||entries[0];
  if(!board)return '<section class="panel"><h2>Фотографии по электрощитам</h2><div class="empty">Сначала добавьте электрощит.</div></section>';
  selectedPhotoHall=board.h.id+'|'+board.p.id;
  const photos=project.photos.filter(x=>x.hallId===board.h.id&&x.panelId===board.p.id);
  const counts=Object.fromEntries([['inbox'],...categories].map(([k])=>[k,photos.filter(x=>photoCategory(x)===k).length]));
  const hasSorted=categories.some(([k])=>counts[k]>0);
  function card(k,label){
    const status=k==='inbox'?'wide':hasSorted?(counts[k]?'filled':'missing'):'neutral';
    return '<button type="button" class="photo-category-v08 '+status+(photoView===k?' chosen':'')+(k==='inbox'?' photo-capture-button':'')+'" data-photo-view="'+k+'" aria-pressed="'+(photoView===k)+'"'+(k==='inbox'?' aria-expanded="'+photoSourcesOpen+'"':'')+'><strong>'+html(label)+'</strong><small>'+counts[k]+' фото</small></button>';
  }
  const rows=photos.filter(x=>photoCategory(x)===photoView).map(x=>{
    const id=html(x.id);
    const findings=project.findings.filter(f=>f.hallId===x.hallId&&f.panelId===x.panelId);
    return '<div class="photo"><button type="button" class="photo-thumb" data-photo-edit="'+id+'" aria-label="Разметить снимок"><img class="thumb" src="'+photoSrc(x)+'" alt="Фото"></button><div><b>'+html(x.name||'Фото')+'</b>'+
    '<div class="field"><label>Распределить в категорию</label><select data-photo-move="'+id+'">'+categoryOptions(photoCategory(x))+'</select></div>'+
    '<div class="field"><label>Комментарий</label><input data-path="photo.'+id+'.comment" value="'+html(x.comment||'')+'"></div>'+
    '<div class="field"><label>Связь с замечанием</label><select data-path="photo.'+id+'.findingId"><option value="">Без замечания</option>'+findings.map(f=>'<option value="'+html(f.id)+'" '+(x.findingId===f.id?'selected':'')+'>'+html(f.description||'Замечание')+'</option>').join('')+'</select></div>'+
    '<div class="actions"><button type="button" class="smallbtn" data-photo-edit="'+id+'">Разметить</button>'+
    (photoCategory(x)==='defects'?'<button type="button" class="smallbtn" data-photo-finding="'+id+'">'+(findings.some(f=>f.id===x.findingId)?'Редактировать замечание':'Создать замечание')+'</button>':'')+
    '<button class="smallbtn" data-action="delete-photo" data-id="'+id+'">Удалить снимок</button></div>'+
    (editingPhotoFindingId===x.id&&photoCategory(x)==='defects'?renderPhotoFindingEditor(x):'')+'</div></div>';
  }).join('');
  return '<section class="panel"><h2>Фотографии по электрощитам</h2>'+selectField('Электрощит','photoPicker.board',selectedPhotoHall,boardOptions())+
    '<div class="photo-categories-v08">'+categories.map(([k,l])=>card(k,l)).join('')+card('inbox','Сделать фото')+'</div>'+
    (photoView==='inbox'&&photoSourcesOpen?'<div class="actions"><button type="button" class="btn light" data-photo-picker="cameraUpload">Одиночный кадр</button><button type="button" class="btn" data-photo-camera>Серия фото</button><button type="button" class="btn secondary" data-photo-picker="imageUpload">Из галереи / файл</button></div><input id="imageUpload" type="file" accept="image/*" multiple hidden><input id="cameraUpload" type="file" accept="image/*" capture="environment" hidden><p class="hint">Снимки сначала попадут сюда. У каждого выберите нужную категорию.</p>':'')+
    (rows||'<div class="empty">В этом разделе пока нет снимков.</div>')+'</section>';
}
// Inline findings belong to the same board as the photograph. Reusing a
// description from another board creates an independent finding record.
function renderPhotoFindingEditor(photo){
  const current=project.findings.find(f=>f.id===photo.findingId&&f.hallId===photo.hallId&&f.panelId===photo.panelId);
  const templates=project.findings.filter(f=>f.id!==current?.id&&String(f.description||'').trim());
  return '<div class="photo-finding-editor" data-finding-photo-editor="'+html(photo.id)+'">'+
    '<h4>'+(current?'Изменить замечание':'Новое замечание по этому щиту')+'</h4>'+
    '<div class="field"><label>Выбрать текст замечания с любого щита или написать новый</label><select data-photo-template><option value="">Написать самостоятельно</option>'+
    templates.map(f=>{const h=findHall(f.hallId),p=h?.panels.find(x=>x.id===f.panelId);return '<option value="'+html(f.id)+'">'+html((p?boardName(h,p):'Другой щит')+' — '+f.description.slice(0,95))+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label>Приоритет</label><select data-finding-field="priority">'+severityOptions(current?.priority||'p2')+'</select></div>'+
    '<div class="field"><label>Обнаруженный дефект / факт</label><textarea data-finding-field="description" placeholder="Опишите выявленное нарушение">'+html(current?.description||'')+'</textarea></div>'+
    '<div class="field"><label>Рекомендация по устранению</label><textarea data-finding-field="recommendation">'+html(current?.recommendation||'')+'</textarea></div>'+
    '<div class="field"><label>Обоснование приоритета (необязательно)</label><textarea data-finding-field="reason">'+html(current?.reason||'')+'</textarea></div>'+
    '<div class="actions"><button class="btn" type="button" data-photo-save-finding="'+html(photo.id)+'">'+(current?'Сохранить изменения':'Сохранить замечание')+'</button>'+
    '<button class="btn secondary" type="button" data-photo-cancel-finding>Отмена</button></div>'+
    '<p class="hint">Замечание сохранится в общем списке, а это фото будет к нему прикреплено. При копировании для другого щита статус и фотографии остаются независимыми.</p></div>';
}
const selection=()=>{const b=boardEntries().find(({h,p})=>h.id+'|'+p.id===selectedPhotoHall);return b?{owner:project,hallId:b.h.id,panelId:b.p.id}:null};
function addToInbox(target,frames){
  if(!target||target.owner!==project||!findPanel(target.hallId,target.panelId))throw new Error('Выбранный щит больше не доступен');
  project.photos.push(...frames.map(f=>({id:ID(),hallId:target.hallId,panelId:target.panelId,category:'inbox',type:'regular',data:f.data,name:f.name,comment:'',findingId:''})));
}
async function addImages(inputId){
  const input=el(inputId),files=Array.from(input?.files||[]),target=selection(),frames=[];
  if(!target||!files.length)return;
  input.value='';
  for(const f of files){
    try{if(f.size>25*1024*1024)throw new Error('слишком большой файл');frames.push({data:await encodePhoto(f),name:f.name||'Фото с камеры'});}
    catch(e){notify('Не удалось добавить '+f.name+': '+e.message);}
  }
  if(!frames.length)return;
  try{addToInbox(target,frames);const ok=await persist();render();if(ok)notify('Добавлено снимков: '+frames.length+(frames.length!==files.length?' из '+files.length:''));}catch(e){notify(e.message);}
}
function reportPhotoGroups(items){
  return [...categories,['inbox','Неразобранные снимки']].map(([k,label])=>[label,
    items.filter(x=>photoCategory(x)===k&&photoSrc(x))]).filter(([,items])=>items.length);
}
function photoReport(items){
  let n=0;
  return reportPhotoGroups(items).map(([label,photos])=>'<h3>'+html(label)+'</h3>'+photos.map(x=>
    '<figure class="photo"><img src="'+photoSrc(x)+'" alt="Фото"><figcaption>Фото '+(++n)+'. '+html(x.comment||x.name||'Без описания')+'</figcaption></figure>').join('')).join('')||'<p>Снимков нет.</p>';
}
function findingPhotoRefs(f){
  const items=project.photos.filter(x=>x.hallId===f.hallId&&x.panelId===f.panelId);
  const refs=reportPhotoGroups(items).flatMap(([,photos])=>photos).flatMap((x,i)=>x.findingId===f.id?[i+1]:[]);
  return refs.length?'<br><small>Фото щита № '+refs.join(', ')+'</small>':'';
}
function photoDialog(title,markup){
  const d=document.createElement('dialog');
  d.className='photo-dialog';
  d.setAttribute('aria-label',title);
  d.innerHTML='<h3>'+html(title)+'</h3>'+markup;
  document.body.append(d);
  d.addEventListener('close',()=>d.remove(),{once:true});
  d.showModal();
  return d;
}
async function openPhotoCamera(){
  const target=selection();
  if(!target)return;
  const d=photoDialog('Съёмка нескольких кадров','<video autoplay playsinline muted></video><p role="status">Запрашиваем доступ к камере…</p><div class="capture-strip"></div><div class="camera-row"><button type="button" class="btn secondary" data-torch aria-pressed="false" disabled>Фонарик</button><button type="button" class="btn secondary" data-native>Камера iPhone</button><button type="button" class="btn" data-shoot disabled>Снять</button></div><div class="camera-finish"><button type="button" class="btn" data-done>Готово</button></div><input type="file" accept="image/*" capture="environment" data-native-file hidden>');
  const video=d.querySelector('video'),status=d.querySelector('[role=status]'),frames=[];
  const shoot=d.querySelector('[data-shoot]'),done=d.querySelector('[data-done]'),torch=d.querySelector('[data-torch]'),native=d.querySelector('[data-native]'),picker=d.querySelector('[data-native-file]');
  let stream,request=0,torchAvailable=false,torchOn=false,saving=false,encoding=false,starting=false;
  const track=()=>stream?.getVideoTracks()[0];
  function resetTorch(){
    torchAvailable=false;torchOn=false;torch.disabled=true;torch.setAttribute('aria-pressed','false');
  }
  function stop(){
    request++;starting=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;shoot.disabled=true;resetTorch();
  }
  function addFrame(data,name){
    frames.push({data,name});const thumb=new Image();
    thumb.src=data;thumb.alt=name;d.querySelector('.capture-strip').append(thumb);
    status.textContent='Снято: '+frames.length;
  }
  async function start(){
    if(!d.open||!navigator.mediaDevices?.getUserMedia){
      status.textContent='Серийная съёмка недоступна. Можно воспользоваться кнопкой «Камера iPhone».';
      return;
    }
    if(starting||stream)return;
    const token=++request;starting=true;
    try{
      const feed=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1440}}});
      if(!d.open||token!==request){feed.getTracks().forEach(t=>t.stop());return;}
      stream=feed;video.srcObject=stream;await video.play();
      if(!d.open||token!==request)return;
      const c=track()?.getCapabilities?.();
      torchAvailable=c?.torch===true||(Array.isArray(c?.torch)&&c.torch.includes(true));
      torch.disabled=!torchAvailable;torch.title=torchAvailable?'Включить или выключить фонарик':'Фонарик недоступен для этой камеры';
      shoot.disabled=false;
      status.textContent=frames.length?'Снято: '+frames.length:'Сделайте несколько кадров, затем нажмите «Готово».';
    }catch{
      if(d.open&&token===request){stop();status.textContent='Не удалось открыть серийную камеру. Воспользуйтесь кнопкой «Камера iPhone».';
      }
    }finally{if(token===request)starting=false;}
  }
  torch.onclick=async()=>{
    const t=track();if(!torchAvailable||!t)return;
    torch.disabled=true;
    try{await t.applyConstraints({advanced:[{torch:!torchOn}]});if(t!==track())return;torchOn=!torchOn;torch.setAttribute('aria-pressed',String(torchOn));}
    catch{if(t===track())status.textContent='Не удалось переключить фонарик.';}
    finally{if(t===track())torch.disabled=!torchAvailable;}
  };
  const visibility=()=>{
    if(!d.open)return;
    if(document.visibilityState==='hidden')stop();
    else if(!stream&&!encoding&&!saving)void start();
  };
  document.addEventListener('visibilitychange',visibility);
  d.addEventListener('close',()=>{stop();document.removeEventListener('visibilitychange',visibility);},{once:true});
  d.addEventListener('cancel',e=>{e.preventDefault();if(!saving&&!encoding)void done.onclick();});
  native.onclick=()=>{stop();picker.value='';picker.click();};
  picker.oncancel=()=>{if(!stream&&!saving&&!encoding)void start();};
  picker.onchange=async()=>{
    const file=picker.files[0];if(!file)return;
    encoding=true;done.disabled=true;native.disabled=true;
    try{if(file.size>25*1024*1024)throw new Error('слишком большой файл');const data=await encodePhoto(file);if(d.open)addFrame(data,file.name||'Фото с камеры iPhone');}
    catch(e){if(d.open)status.textContent='Не удалось добавить снимок: '+e.message;}
    finally{encoding=false;done.disabled=false;native.disabled=false;if(d.open&&!stream&&document.visibilityState==='visible')void start();}
  };
  shoot.onclick=()=>{
    if(!video.videoWidth||saving)return;
    const cv=document.createElement('canvas'),ratio=Math.min(1,1800/Math.max(video.videoWidth,video.videoHeight));
    cv.width=Math.round(video.videoWidth*ratio);cv.height=Math.round(video.videoHeight*ratio);
    cv.getContext('2d').drawImage(video,0,0,cv.width,cv.height);
    addFrame(cv.toDataURL('image/jpeg',.86),'Кадр '+(frames.length+1));
  };
  done.onclick=async()=>{
    if(saving||encoding)return;
    if(!frames.length){d.close();return;}
    saving=true;done.disabled=true;native.disabled=true;stop();
    const n=frames.length;
    try{addToInbox(target,frames);}catch(e){status.textContent=e.message;saving=false;done.disabled=false;native.disabled=false;return;}
    frames.length=0;d.close();
    const ok=await persist();render();if(ok)notify('Добавлено снимков: '+n);
  };
  void start();
}
function editPhoto(id){
  const x=project.photos.find(x=>String(x.id)===id);
  if(!x||!validPhoto(x.data))return;
  const d=photoDialog('Разметка фото','<div class="markup-tools"><button class="smallbtn" data-tool="pen" aria-pressed="true">Палец</button><button class="smallbtn" data-tool="text" aria-pressed="false">Подпись</button><label>Цвет <input type="color" value="#ff3030"></label><button class="smallbtn" data-undo>Отменить</button><button class="smallbtn" data-clear>Очистить</button></div><label class="markup-text" hidden>Текст подписи <input type="text" maxlength="120" placeholder="Введи текст и коснись фото"></label><div class="markup-stage"><canvas aria-label="Фото для разметки"></canvas></div><p role="status">Загружаем фото…</p><div class="actions"><button class="btn" data-save disabled>Сохранить</button><button class="btn light" data-cancel>Закрыть</button></div>');
  const cv=d.querySelector('canvas'),ctx=cv.getContext('2d'),base=new Image(),status=d.querySelector('[role=status]'),save=d.querySelector('[data-save]'),label=d.querySelector('.markup-text');
  let ops=Array.isArray(x.markupOps)?x.markupOps.filter(o=>o&&['pen','text'].includes(o.kind)&&/^#[0-9a-f]{6}$/i.test(o.color)&&Array.isArray(o.points)&&o.points.length&&o.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))).slice():[],tool='pen',stroke=null,dirty=false;
  function paint(){
    if(!base.naturalWidth)return;
    ctx.drawImage(base,0,0,cv.width,cv.height);
    const width=Math.max(4,Math.round(Math.max(cv.width,cv.height)/210));
    for(const o of ops){
      ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=o.color;ctx.fillStyle=o.color;
      const p=o.points[0], px=p.x*cv.width,py=p.y*cv.height;
      if(o.kind==='text'){ctx.font='bold '+Math.max(18,width*5)+'px system-ui';ctx.textBaseline='top';ctx.strokeStyle='#171717';ctx.lineWidth=width*.55;const left=Math.min(px,cv.width-12),top=Math.min(py,cv.height-width*5);ctx.strokeText(String(o.text),left,Math.max(0,top),cv.width-left);ctx.fillText(String(o.text),left,Math.max(0,top),cv.width-left);}
      else{ctx.beginPath();ctx.moveTo(px,py);if(o.points.length===1)ctx.lineTo(px+.01,py);else for(const a of o.points.slice(1))ctx.lineTo(a.x*cv.width,a.y*cv.height);ctx.stroke();}
    }
  }
  const point=e=>{const r=cv.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
  function changed(){dirty=true;paint();}
  cv.onpointerdown=e=>{
    if(save.disabled||stroke||e.button!==0)return;
    const p=point(e),color=d.querySelector('input[type=color]').value;
    if(tool==='text'){const text=label.querySelector('input').value.trim();if(!text){label.querySelector('input').focus();return;}ops.push({kind:'text',color,text,points:[p]});changed();return;}
    cv.setPointerCapture(e.pointerId);const op={kind:'pen',color,points:[p]};ops.push(op);stroke={id:e.pointerId,op};changed();
  };
  cv.onpointermove=e=>{if(stroke?.id===e.pointerId){stroke.op.points.push(point(e));paint();}};
  cv.onpointerup=cv.onpointercancel=e=>{if(stroke?.id===e.pointerId)stroke=null;};
  for(const b of d.querySelectorAll('[data-tool]'))b.onclick=()=>{tool=b.dataset.tool;label.hidden=tool!=='text';for(const t of d.querySelectorAll('[data-tool]'))t.setAttribute('aria-pressed',String(t===b));if(tool==='text')label.querySelector('input').focus();};
  d.querySelector('[data-undo]').onclick=()=>{if(ops.length){ops.pop();changed();}};
  d.querySelector('[data-clear]').onclick=()=>{if(ops.length){ops=[];changed();}};
  const cancel=()=>{if(!dirty||confirm('Закрыть без сохранения разметки?'))d.close();};
  d.querySelector('[data-cancel]').onclick=cancel;
  d.addEventListener('cancel',e=>{e.preventDefault();cancel();});
  save.onclick=async()=>{
    if(!dirty){d.close();return;}
    save.disabled=true;x.markupOps=ops;
    if(ops.length)x.marked=cv.toDataURL('image/jpeg',.9);else delete x.marked;
    if(await persist()){d.close();render();notify('Разметка сохранена, оригинал не изменён');}else{status.textContent='Не удалось сохранить. Попробуйте ещё раз.';save.disabled=false;}
  };
  base.onload=()=>{const ratio=Math.min(1,2000/Math.max(base.naturalWidth,base.naturalHeight));cv.width=Math.round(base.naturalWidth*ratio);cv.height=Math.round(base.naturalHeight*ratio);paint();save.disabled=false;status.textContent='Рисуйте пальцем или выберите «Подпись».';};
  base.onerror=()=>{status.textContent='Не удалось открыть снимок.';};base.src=x.data;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-photo-view],[data-photo-picker],[data-photo-camera],[data-photo-edit],[data-photo-finding],[data-photo-save-finding],[data-photo-cancel-finding]');
  if(!b)return;
  if(b.hasAttribute('data-photo-view')){const next=b.dataset.photoView;photoSourcesOpen=next==='inbox'&&(photoView!=='inbox'||!photoSourcesOpen);photoView=next;render();if(next==='inbox')document.querySelector('[data-photo-view="inbox"]')?.focus();}
  else if(b.hasAttribute('data-photo-picker'))el(b.dataset.photoPicker)?.click();
  else if(b.hasAttribute('data-photo-camera'))openPhotoCamera();
  else if(b.hasAttribute('data-photo-finding')){
    const id=b.dataset.photoFinding;
    editingPhotoFindingId=editingPhotoFindingId===id?'':id;
    render();
    if(editingPhotoFindingId)document.querySelector('[data-finding-photo-editor="'+id+'"]')?.scrollIntoView({block:'nearest'});
  }
  else if(b.hasAttribute('data-photo-cancel-finding')){editingPhotoFindingId='';render();}
  else if(b.hasAttribute('data-photo-save-finding')){
    const photo=project.photos.find(x=>x.id===b.dataset.photoSaveFinding);
    const editor=b.closest('[data-finding-photo-editor]');
    if(!photo||!editor)return;
    const val=k=>editor.querySelector('[data-finding-field="'+k+'"]')?.value||'';
    const description=val('description').trim(),recommendation=val('recommendation').trim(),reason=val('reason').trim();
    if(!description){notify('Опишите обнаруженный дефект');editor.querySelector('[data-finding-field="description"]')?.focus();return;}
    const existing=project.findings.find(f=>f.id===photo.findingId&&f.hallId===photo.hallId&&f.panelId===photo.panelId);
    let finding=existing;
    if(!finding){
      finding={id:ID(),hallId:photo.hallId,panelId:photo.panelId,priority:'p2',description:'',recommendation:'',reason:'',due:'',owner:''};
      project.findings.push(finding);
    }
    finding.priority=val('priority');finding.description=description;finding.recommendation=recommendation;finding.reason=reason;
    photo.findingId=finding.id;
    const panel=findPanel(photo.hallId,photo.panelId);
    if(panel&&panel.inspection!=='issues')panel.inspection='issues';
    editingPhotoFindingId='';
    scheduleSave();render();notify(existing?'Замечание обновлено':'Замечание создано и связано с фотографией');
  }
  else editPhoto(b.dataset.photoEdit);
});
document.addEventListener('change',async e=>{
  if(e.target.matches('[data-photo-template]')){
    const editor=e.target.closest('[data-finding-photo-editor]'),source=project.findings.find(f=>f.id===e.target.value);
    if(!editor||!source)return;
    for(const key of ['description','recommendation','reason','priority']){
      const input=editor.querySelector('[data-finding-field="'+key+'"]');
      if(input)input.value=source[key]|| (key==='priority'?'p2':'');
    }
    return;
  }
  if(!e.target.matches('[data-photo-move]'))return;
  const x=project.photos.find(x=>String(x.id)===e.target.dataset.photoMove),k=e.target.value;
  if(!x||!(k==='inbox'||isCategory(k)))return;
  x.category=k;x.type=k==='thermal'?'thermal':'regular';
  if(editingPhotoFindingId===x.id)editingPhotoFindingId='';
  const ok=await persist();render();if(ok)notify(k==='inbox'?'Снимок возвращён в неразобранные':'Снимок перенесён в «'+categories.find(([c])=>c===k)[1]+'»');
});
