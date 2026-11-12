'use strict';
const PHOTO_CATEGORIES_V08=[['general','Общий вид','Общий вид щита и оборудования'],['scheme','Схема','Схемы, маркировка и документация'],['defects','Нарушения','Выявленные дефекты и повреждения'],['thermal','Тепловизионная съёмка','Термограммы и тепловизионные снимки']];
let photoCategoryV08='general';
const validCategoryV08=x=>PHOTO_CATEGORIES_V08.some(c=>c[0]===x);
function getPhotoCategoryV08(x){if(validCategoryV08(x.category))return x.category;if(x.type==='thermal')return 'thermal';const s=(String(x.comment||'')+' '+String(x.name||'')).toLowerCase();if(/схем|scheme|diagram|маркировк|документац/.test(s))return 'scheme';if(/наруш|дефект|поврежд|оголен|оголён|неисправ|перегрев|обуг/.test(s))return 'defects';return 'general'}
function categoryNameV08(x){return PHOTO_CATEGORIES_V08.find(c=>c[0]===x)?.[1]||'Общий вид'}
function renderPhotos(){
const entries=boardEntries(),chosen=entries.find(({h,p})=>h.id+'|'+p.id===selectedPhotoHall)||entries[0];
if(chosen)selectedPhotoHall=chosen.h.id+'|'+chosen.p.id;
const photos=chosen?project.photos.filter(x=>x.hallId===chosen.h.id&&x.panelId===chosen.p.id):[];
const cards=PHOTO_CATEGORIES_V08.map(([key,label])=>{const count=photos.filter(x=>getPhotoCategoryV08(x)===key).length;return '<button type="button" class="photo-category-v08 '+(photoCategoryV08===key?'chosen':'')+'" data-photo-category="'+key+'" aria-pressed="'+(photoCategoryV08===key)+'"><strong>'+html(label)+'</strong><small>'+count+' фото</small></button>'}).join('');
const shown=photos.filter(x=>getPhotoCategoryV08(x)===photoCategoryV08);
const rows=shown.map(x=>'<div class="photo"><img class="thumb" src="'+x.data+'" alt="Фото"><div><b>'+html(x.name||'Фото')+'</b><div class="field"><label>Категория</label><select data-path="photo.'+x.id+'.category">'+PHOTO_CATEGORIES_V08.map(([k,l])=>'<option value="'+k+'" '+(getPhotoCategoryV08(x)===k?'selected':'')+'>'+html(l)+'</option>').join('')+'</select></div><div class="field"><label>Комментарий</label><input data-path="photo.'+x.id+'.comment" value="'+html(x.comment||'')+'" placeholder="Что изображено"></div><div class="field"><label>Связь с замечанием</label><select data-path="photo.'+x.id+'.findingId"><option value="">Без замечания</option>'+project.findings.filter(f=>f.hallId===x.hallId&&f.panelId===x.panelId).map(f=>'<option value="'+f.id+'" '+(x.findingId===f.id?'selected':'')+'>'+html(f.description||'Замечание')+'</option>').join('')+'</select></div><button class="smallbtn" data-action="delete-photo" data-id="'+x.id+'">Удалить снимок</button></div></div>').join('');
return '<section class="panel"><h2>Фотографии по электрощитам</h2><p>Для каждого щита четыре категории. Показываются только снимки выбранной категории.</p>'+(!chosen?'<div class="empty">Сначала добавьте электрощит.</div>':selectField('Электрощит','photoPicker.board',selectedPhotoHall,boardOptions())+'<div class="photo-categories-v08">'+cards+'</div><h3>'+html(categoryNameV08(photoCategoryV08))+' · '+shown.length+' фото</h3><p class="hint">'+html(PHOTO_CATEGORIES_V08.find(x=>x[0]===photoCategoryV08)?.[2]||'')+'</p><div class="grid"><div class="field"><label>Из галереи / файлов</label><input id="imageUpload" type="file" accept="image/jpeg,image/png,image/webp" multiple></div><div class="field"><label>Сделать фото камерой iPhone</label><input id="cameraUpload" type="file" accept="image/*" capture="environment"></div></div><p class="hint">Фотографии сохраняются в выбранной категории. Категорию каждого снимка можно поменять.</p>'+(shown.length?rows:'<div class="empty">В этой категории пока нет снимков.</div>'))+'</section>';
}
async function addImages(inputId){
const input=el(inputId),files=Array.from(input?.files||[]);
if(!files.length)return;
const selected=boardEntries().find(({h,p})=>h.id+'|'+p.id===selectedPhotoHall);
if(!selected)return notify('Выберите щит');
const {h,p}=selected;let added=0;
for(const file of files){try{if(file.size>25*1024*1024){notify('Слишком большой снимок: '+file.name);continue}const data=await encodePhoto(file);project.photos.push({id:ID(),hallId:h.id,panelId:p.id,category:photoCategoryV08,type:photoCategoryV08==='thermal'?'thermal':'regular',data,name:file.name||'Фото с камеры',comment:'',findingId:''});added++}catch(e){notify('Не удалось обработать фото '+file.name+': '+e.message)}}
if(input)input.value='';
await persist();render();notify('Добавлено снимков: '+added);
}
function photoReport(items){
if(!items.length)return '<p>Снимков нет.</p>';
return PHOTO_CATEGORIES_V08.map(([category,label])=>{const photos=items.filter(x=>getPhotoCategoryV08(x)===category);if(!photos.length)return '';return '<h3>'+html(label)+'</h3>'+photos.map((x,i)=>'<figure class="photo"><img src="'+x.data+'" alt="Фото"><figcaption>'+html(label)+', фото '+(i+1)+'. '+html(x.comment||x.name||'Без описания')+'</figcaption></figure>').join('')}).join('');
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-photo-category]');if(t&&validCategoryV08(t.dataset.photoCategory)){photoCategoryV08=t.dataset.photoCategory;render()}});
document.addEventListener('change',e=>{if(e.target?.dataset?.path?.startsWith('photo.')&&e.target.dataset.path.endsWith('.category'))queueMicrotask(()=>render())});