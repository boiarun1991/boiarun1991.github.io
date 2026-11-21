/* Offline PDF export, v0.12.3. All data stays on this device. */
(()=>{
'use strict';
let readyPDF=null, readyName='';
const oldReports=renderReports;
renderReports=function(){
 return oldReports().replace('<h2>Два итоговых PDF</h2>',
 '<h2>Два итоговых PDF</h2><div class="notice ok"><b>Прямое сохранение PDF на iPhone</b><p>Подготовьте файл, затем нажмите «Сохранить PDF». Печать не требуется.</p><div class="actions"><button class="btn" type="button" onclick="event.stopPropagation();preparePDF(\'full\')">Подготовить полный PDF</button><button class="btn secondary" type="button" onclick="event.stopPropagation();preparePDF(\'summary\')">Подготовить заключение PDF</button></div><div id="pdfReady"></div></div>');
};
const W=1190,H=1684,M=76,B=H-85;
const encoder=new TextEncoder();
const byte=s=>encoder.encode(s);
const join=xs=>{let n=xs.reduce((a,x)=>a+x.length,0),b=new Uint8Array(n),p=0;for(const x of xs){b.set(x,p);p+=x.length;}return b;};
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
function pdfFromJpegs(jpegs){
 let chunks=[byte('%PDF-1.4\n%PDF\n')],offsets=[0],pos=chunks[0].length;
 function obj(i,parts){offsets[i]=pos;const c=join([byte(i+' 0 obj\n'),...parts,byte('\nendobj\n')]);chunks.push(c);pos+=c.length;}
 let total=2+jpegs.length*3;
 obj(1,[byte('<< /Type /Catalog /Pages 2 0 R >>')]);
 let kids=[];for(let i=0;i<jpegs.length;i++)kids.push((3+i*3)+' 0 R');
 obj(2,[byte('<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+jpegs.length+' >>')]);
 for(let i=0;i<jpegs.length;i++){
   let page=3+i*3,im=page+1,content=page+2,img=jpegs[i];
   obj(page,[byte('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im'+i+' '+im+' 0 R >> >> /Contents '+content+' 0 R >>')]);
   obj(im,[byte('<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+img.length+' >>\nstream\n'),img,byte('\nendstream')]);
   let stream=byte('q\n595 0 0 842 0 0 cm\n/Im'+i+' Do\nQ\n');
   obj(content,[byte('<< /Length '+stream.length+' >>\nstream\n'),stream,byte('endstream')]);
 }
 let xref=pos,lines=['xref','0 '+(total+1),'0000000000 65535 f '];
 for(let i=1;i<=total;i++)lines.push(String(offsets[i]).padStart(10,'0')+' 00000 n ');
 lines.push('trailer','<< /Size '+(total+1)+' /Root 1 0 R >>','startxref',String(xref),'%%EOF');
 chunks.push(byte(lines.join('\n')+'\n'));
 return new Blob(chunks,{type:'application/pdf'});
}
function canvasDoc(){
 let cv=document.createElement('canvas');cv.width=W;cv.height=H;
 let ctx=cv.getContext('2d',{alpha:false}),pages=[],y=M,pageNo=0;
 function init(){ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#34465f';ctx.font='19px Arial';ctx.fillText('ЭлектроКиноТест · техническое обследование',M,44);ctx.strokeStyle='#d8e0eb';ctx.beginPath();ctx.moveTo(M,55);ctx.lineTo(W-M,55);ctx.stroke();y=M+28;pageNo++;}
 function finish(){ctx.font='18px Arial';ctx.fillStyle='#607080';ctx.fillText('Страница '+pageNo,M,H-38);let data=cv.toDataURL('image/jpeg',.83).split(',')[1];let raw=atob(data),arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);pages.push(arr);}
 function need(ht){if(y+ht>B){finish();init();}}
 function line(t,size=24,bold=false,indent=0,color='#202d41'){
   t=String(t??'—');ctx.font=(bold?'bold ':'')+size+'px Arial';
   let max=W-2*M-indent,words=t.replace(/\s+/g,' ').split(' '),rows=[],curr='';
   for(let word of words){if(!word)continue;let next=curr?curr+' '+word:word;
     if(ctx.measureText(next).width<=max){curr=next;continue;}
     if(curr){rows.push(curr);curr='';}
     while(ctx.measureText(word).width>max&&word.length>1){let j=1;while(j<word.length&&ctx.measureText(word.slice(0,j+1)).width<=max)j++;rows.push(word.slice(0,j));word=word.slice(j);}
     curr=word;
   }
   if(curr)rows.push(curr);if(!rows.length)rows=[''];
   for(let row of rows){need(size*1.55);ctx.fillStyle=color;ctx.font=(bold?'bold ':'')+size+'px Arial';ctx.fillText(row,M+indent,y);y+=size*1.48;}
 }
 function gap(n=12){need(n);y+=n;}
 function heading(t){gap(16);line(t,31,true,0,'#204b8b');gap(8);}
 function sub(t){gap(12);line(t,26,true);gap(6);}
 function field(k,v){line(k+': '+(v===''||v==null?'—':v),22,false,8);}
 async function picture(p,label){
   let src=p.marked||p.data;if(typeof src!=='string')return;
   let img=new Image();img.src=src;
   try{await img.decode();}catch{return;}
   let maxW=W-2*M, maxH=625;
   let s=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight,1.5);
   let iw=Math.round(img.naturalWidth*s),ih=Math.round(img.naturalHeight*s);
   need(ih+75);
   ctx.fillStyle='#f3f5f8';ctx.fillRect(M,y,maxW,ih+12);
   ctx.drawImage(img,M+(maxW-iw)/2,y+6,iw,ih);y+=ih+22;
   line(label,19);gap(8);
 }
 init();return {heading,sub,field,line,gap,picture,finish:()=>{finish();return pages}};
}
async function buildPDF(type){
 const d=canvasDoc();
 const pr=project,boards=boardEntries(),name=String(pr.city||pr.name||'otchet').replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g,'_');
 d.heading(type==='full'?'Акт обследования электрооборудования':'Итоговое техническое заключение');
 d.field('Объект',pr.name);d.field('Город',pr.city);d.field('Адрес',pr.address);d.field('Дата',pr.date);
 d.field('Обследующие',inspectors().join('; '));d.field('Представитель',pr.representative);d.field('Объём работ',pr.scope);d.field('Ограничения',pr.limitations);
 if(type==='summary'){
   d.heading('Сводные результаты');
   d.field('Обследовано щитов и объектов',boards.filter(x=>x.p.inspection!=='notdone').length+' из '+boards.length);
   d.field('Замечаний',pr.findings.length);
   d.heading('Заключение');
   (pr.conclusionCustom?pr.conclusionEdit:generatedConclusion()).split(/\n+/).forEach(t=>{if(t.trim()){d.line(t.trim());d.gap(8);}});
   d.heading('Замечания по приоритетам');
   for(const priority of ['p1','p2','p3']){
     let list=pr.findings.filter(f=>f.priority===priority);
     if(list.length){d.sub(priorityWord(priority));
       for(const f of list){let h=findHall(f.hallId),p=h?.panels.find(x=>x.id===f.panelId);
        d.field('Щит',p?boardName(h,p):'Не указан');d.field('Дефект',f.description);d.field('Рекомендация',f.recommendation);d.field('Обоснование',f.reason);d.gap(12);
       }
     }
   }
 }else{
   d.heading('Сводка');d.field('Щитов и объектов',boards.length);d.field('Замечаний',pr.findings.length);d.field('Фотографий',pr.photos.length);
   d.heading('Сводная ведомость замечаний');
   for(const f of pr.findings){let h=findHall(f.hallId),p=h?.panels.find(x=>x.id===f.panelId);
     d.sub(p?boardName(h,p):'Не указан');d.field('Приоритет',priorityWord(f.priority));d.field('Дефект',f.description);d.field('Рекомендация',f.recommendation);d.field('Обоснование',f.reason);
   }
   for(const {h,p} of boards){
     d.heading((p.kind==='object'?'Объект: ':'Электрощит: ')+boardName(h,p));
     d.field('Расположение',p.location);d.field('Статус',statusWord(p.inspection));d.field('Вводной автомат, А',p.inputBreaker);d.field('Тип защиты',p.breakerType);d.field('Примечания',p.notes);
     d.sub('Визуальный осмотр');
     for(let i=0;i<CHECKS.length;i++){let a=p.check?.[i]||{};d.field((i+1)+'. '+CHECKS[i][1],statusWord(a.status));if(a.note)d.field('Примечание',a.note);}
     d.sub('Измерения');for(const k of ['l1','l2','l3','n','pe'])d.field(k.toUpperCase()+' (А)',p.measures?.[k]||'Не измерено');
     d.field('Режим нагрузки',loadMode(p.measures?.mode));
     d.sub('Тепловизионное обследование');
     d.field('Статус',statusWord(p.thermal?.status));
     d.field('Окружающая температура',p.thermal?.ambient);d.field('Максимальная температура',p.thermal?.maxTemp);d.field('Комментарий',p.thermal?.comment);
     const fs=pr.findings.filter(f=>f.hallId===h.id&&f.panelId===p.id);
     if(fs.length){d.sub('Замечания по щиту');for(const f of fs){d.field('Дефект',f.description);d.field('Приоритет',priorityWord(f.priority));d.field('Рекомендация',f.recommendation);}}
     const photos=pr.photos.filter(f=>f.hallId===h.id&&f.panelId===p.id);
     if(photos.length){d.sub('Фотографии и термограммы');for(let i=0;i<photos.length;i++){const ph=photos[i];await d.picture(ph,(i+1)+'. '+(ph.comment||ph.name||'Снимок'));await yieldUI();}}
     await yieldUI();
   }
 }
 d.heading('Подписи');
 for(const person of inspectors())d.field('Обследующий','________________ / '+person);
 d.field('Представитель объекта','________________ / '+(pr.representative||''));
 let pages=d.finish();return {blob:pdfFromJpegs(pages),name:'ElektroKinoTest_'+name+'_'+type+'_'+(pr.date||'')+'.pdf',pages:pages.length};
}
window.preparePDF=async function(type){
 let div=el('pdfReady');if(!div)return;
 div.innerHTML='<p>Подготавливаю PDF, пожалуйста, подождите…</p>';
 try{await persist();const r=await buildPDF(type);readyPDF=r.blob;readyName=r.name;
 div.innerHTML='<p><b>PDF готов:</b> '+r.pages+' стр., '+(r.blob.size/1048576).toFixed(1)+' МБ</p><button type="button" class="btn" onclick="event.stopPropagation();savePreparedPDF()">Сохранить PDF на iPhone</button>';
 }catch(e){div.textContent='Ошибка формирования PDF: '+e.message;}
};
window.savePreparedPDF=function(){
 if(!readyPDF)return;
 const file=new File([readyPDF],readyName,{type:'application/pdf'});
 if(navigator.canShare?.({files:[file]})){
  navigator.share({files:[file],title:readyName}).catch(e=>{if(e.name!=='AbortError')downloadPDF(file);});
 }else downloadPDF(file);
};
function downloadPDF(file){
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
})();