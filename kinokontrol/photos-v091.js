'use strict';
const categories=[['general','Общий вид'],['scheme','Схема'],['defects','Нарушения'],['thermal','Тепловизионная съёмка']];
let photoView='inbox', photoSourcesOpen=false;
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
    '<div class="actions"><button type="button" class="smallbtn" data-photo-edit="'+id+'">Разметить</button><button class="smallbtn" data-action="delete-photo" data-id="'+id+'">Удалить снимок</button></div></div></div>';
  }).join('');
  return '<section class="panel"><h2>Фотографии по электрощитам</h2>'+selectField('Электрощит','photoPicker.board',selectedPhotoHall,boardOptions())+
    '<div class="photo-categories-v08">'+categories.map(([k,l])=>card(k,l)).join('')+card('inbox','Сделать фото')+'</div>'+
    (photoView==='inbox'&&photoSourcesOpen?'<div class="actions"><button type="button" class="btn light" data-photo-picker="cameraUpload">Одиночный кадр</button><button type="button" class="btn" data-photo-camera>Серия фото</button><button type="button" class="btn secondary" data-photo-picker="imageUpload">Из галереи / файл</button></div><input id="imageUpload" type="file" accept="image/*" multiple hidden><input id="cameraUpload" type="file" accept="image/*" capture="environment" hidden><p class="hint">Снимки сначала попадут сюда. У каждого выберите нужную категорию.</p>':'')+
    (rows||'<div class="empty">В этом разделе пока нет снимков.</div>')+'</section>';
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
function photoReport(items){
  const sorted=[...categories,['inbox','Неразобранные снимки']];
  return sorted.map(([k,label])=>{
    const photos=items.filter(x=>photoCategory(x)===k&&photoSrc(x));
    return photos.length?'<h3>'+html(label)+'</h3>'+photos.map((x,i)=>'<figure class="photo"><img src="'+photoSrc(x)+'" alt="Фото"><figcaption>'+html(label)+', фото '+(i+1)+'. '+html(x.comment||x.name||'Без описания')+'</figcaption></figure>').join(''):'';
  }).join('')||'<p>Снимков нет.</p>';
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
  if(!navigator.mediaDevices?.getUserMedia){notify('Серийная съёмка недоступна. Используйте галерею или одиночный кадр.');return;}
  const d=photoDialog('Съёмка нескольких кадров','<video autoplay playsinline muted></video><p role="status">Запрашиваем доступ к камере…</p><div class="capture-strip"></div><div class="actions"><button class="btn" data-shoot disabled>Снять</button><button class="btn secondary" data-done disabled>Готово</button><button class="btn light" data-cancel>Закрыть</button></div>');
  const video=d.querySelector('video'),status=d.querySelector('[role=status]'),frames=[],shoot=d.querySelector('[data-shoot]'),done=d.querySelector('[data-done]');
  let stream;
  const stop=()=>stream?.getTracks().forEach(t=>t.stop());
  function cancel(){if(!frames.length||confirm('Закрыть камеру без добавления снятых кадров?'))d.close();}
  d.addEventListener('close',stop,{once:true});
  const hide=()=>{if(document.visibilityState==='hidden'&&stream){stop();shoot.disabled=true;status.textContent=frames.length?'Камера остановлена. Нажмите «Готово», чтобы сохранить кадры.':'Камера остановлена. Откройте её заново.';}};
  document.addEventListener('visibilitychange',hide);
  d.addEventListener('close',()=>document.removeEventListener('visibilitychange',hide),{once:true});
  d.addEventListener('cancel',e=>{e.preventDefault();cancel();});
  d.querySelector('[data-cancel]').onclick=cancel;
  shoot.onclick=()=>{
    if(!video.videoWidth)return;
    const cv=document.createElement('canvas'),ratio=Math.min(1,1800/Math.max(video.videoWidth,video.videoHeight));
    cv.width=Math.round(video.videoWidth*ratio);cv.height=Math.round(video.videoHeight*ratio);
    cv.getContext('2d').drawImage(video,0,0,cv.width,cv.height);
    const f={data:cv.toDataURL('image/jpeg',.86),name:'Кадр '+(frames.length+1)};
    frames.push(f);
    const thumb=new Image();thumb.src=f.data;thumb.alt=f.name;d.querySelector('.capture-strip').append(thumb);
    status.textContent='Снято: '+frames.length;done.disabled=false;
  };
  done.onclick=async()=>{
    done.disabled=true;
    try{addToInbox(target,frames);const n=frames.length;frames.length=0;d.close();const ok=await persist();render();if(ok)notify('Добавлено снимков: '+n);}catch(e){status.textContent=e.message;done.disabled=false;}
  };
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1440}}});
    if(!d.open){stop();return;}
    video.srcObject=stream;await video.play();
    if(d.open){status.textContent='Сделайте несколько кадров, затем нажмите «Готово».';shoot.disabled=false;}
  }catch(e){stop();if(d.open)status.textContent='Не удалось открыть камеру. Закройте окно и воспользуйтесь галереей или одиночным кадром.';}
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
  const b=e.target.closest('[data-photo-view],[data-photo-picker],[data-photo-camera],[data-photo-edit]');
  if(!b)return;
  if(b.hasAttribute('data-photo-view')){const next=b.dataset.photoView;photoSourcesOpen=next==='inbox'&&(photoView!=='inbox'||!photoSourcesOpen);photoView=next;render();if(next==='inbox')document.querySelector('[data-photo-view="inbox"]')?.focus();}
  else if(b.hasAttribute('data-photo-picker'))el(b.dataset.photoPicker)?.click();
  else if(b.hasAttribute('data-photo-camera'))openPhotoCamera();
  else editPhoto(b.dataset.photoEdit);
});
document.addEventListener('change',async e=>{
  if(!e.target.matches('[data-photo-move]'))return;
  const x=project.photos.find(x=>String(x.id)===e.target.dataset.photoMove),k=e.target.value;
  if(!x||!(k==='inbox'||isCategory(k)))return;
  x.category=k;x.type=k==='thermal'?'thermal':'regular';
  const ok=await persist();render();if(ok)notify(k==='inbox'?'Снимок возвращён в неразобранные':'Снимок перенесён в «'+categories.find(([c])=>c===k)[1]+'»');
});
