/* ElektroKinoTest 0.13.0: Отчёт ТО fixed-A4-page PDF export using original report HTML */
(()=>{
'use strict';
let savedBlob=null,savedName='';
const LIBS=[
 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
function loadScript(url){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=url;
  script.onload=resolve;script.onerror=()=>reject(new Error('Не загружен модуль PDF. Проверьте интернет'));
  document.head.appendChild(script);
 });
}
async function libs(){
 if(!window.html2canvas)await loadScript(LIBS[0]);
 if(!window.jspdf?.jsPDF)await loadScript(LIBS[1]);
}
const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
function splitTable(el){
 // Each table row is a separate printable block, retaining the original header.
 const table=el.cloneNode(true);
 const rows=Array.from(table.querySelectorAll('tbody > tr'));
 const direct=rows.length?rows:Array.from(table.querySelectorAll(':scope > tr'));
 if(!direct.length)return [table];
 const head=table.querySelector('thead');
 const pieces=[];
 for(const row of direct){
  const t=table.cloneNode(false);t.style.width='100%';
  if(head)t.append(head.cloneNode(true));
  const body=document.createElement('tbody');body.append(row.cloneNode(true));t.append(body);
  pieces.push(t);
 }
 return pieces;
}
function splitParagraph(node,limit=450){
 const source=node.textContent||'';
 if(source.length<=limit)return [node.cloneNode(true)];
 const result=[];let remainder=source;
 while(remainder.length){
  if(remainder.length<=limit){const p=node.cloneNode(false);p.textContent=remainder;result.push(p);break;}
  let cut=remainder.lastIndexOf(' ',limit);
  if(cut<limit/2)cut=limit;
  const p=node.cloneNode(false);p.textContent=remainder.slice(0,cut);
  result.push(p);remainder=remainder.slice(cut).trimStart();
 }
 return result;
}
function chunks(markup){
 const parsed=new DOMParser().parseFromString(markup,'text/html'),nodes=[];
 function add(n){
  if(n.nodeType!==1)return;
  if(n.matches('.report-tools,button.print,script,style'))return;
  if(n.matches('section.pagebreak')){nodes.push({break:true});Array.from(n.children).forEach(add);return;}
  if(n.matches('table')){splitTable(n).forEach(el=>nodes.push({el}));return;}
  if(n.matches('p')){splitParagraph(n).forEach(el=>nodes.push({el}));return;}
  if(n.matches('figure.photo')){
    const prev=nodes[nodes.length-1];
    if(prev?.photos&&prev.photos.length===1){prev.photos.push(n.cloneNode(true));return;}
    nodes.push({photos:[n.cloneNode(true)]});return;
  }
  nodes.push({el:n.cloneNode(true)});
 }
 Array.from(parsed.body.children).forEach(add);
 return nodes;
}
function stage(){
 const curtain=document.createElement('div');
 curtain.style.cssText='position:fixed;inset:0;background:#f7f9fc;z-index:2147483640;overflow:hidden';
 const msg=document.createElement('div');
 msg.style.cssText='position:absolute;right:8px;top:8px;padding:9px;background:#14315a;color:white;border-radius:6px;font:13px Arial;z-index:2';
 msg.textContent='Подготовка PDF…';msg.style.display='none';curtain.append(msg);
 const paper=document.createElement('div');
 paper.style.cssText='position:absolute;top:0;left:0;width:794px;height:1123px;background:white;color:#1b2737;overflow:hidden;box-sizing:border-box';
 const style=document.createElement('style');
 style.textContent=' #pdf-page-body{font:13.3px/1.42 Arial,sans-serif;width:680px;color:#1b2737}#pdf-page-body *,#pdf-page-body *:before,#pdf-page-body *:after{box-sizing:border-box}#pdf-page-body h1{font-size:25px;line-height:1.18;margin:0 0 18px}#pdf-page-body h2{font-size:17px;margin:18px 0 9px;border-bottom:1px solid #b6c4d4;padding-bottom:5px}#pdf-page-body h3{font-size:14.3px;margin:15px 0 6px}#pdf-page-body p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 10px}#pdf-page-body table{border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0 12px;font-size:11.3px}#pdf-page-body td,#pdf-page-body th{border:1px solid #b7c1cf;padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}#pdf-page-body th{background:#eff3f7;font-weight:600}#pdf-page-body small{color:#596b80}#pdf-page-body .photo{display:inline-block;width:46%;margin:6px 1%;vertical-align:top}#pdf-page-body .photo img{display:block;width:100%;max-height:280px;object-fit:contain}#pdf-page-body .photo figcaption{font-size:11px;overflow-wrap:anywhere}';
 paper.innerHTML='<div style="position:absolute;top:20px;left:57px;right:57px;border-bottom:1px solid #d6dfe9;padding-bottom:8px;font:12px Arial;color:#40546f">ЭлектроКиноТест · Акт обследования электрооборудования</div><div id="pdf-page-body" style="position:absolute;top:65px;left:57px;width:680px"></div><div id="pdf-page-footer" style="position:absolute;bottom:20px;left:57px;right:57px;border-top:1px solid #d6dfe9;padding-top:6px;font:11px Arial;color:#617289"></div>';
 curtain.append(style,paper);
 // The A4 canvas stays mounted for html2canvas, but never appears over the app.
 const veil=document.createElement('div');
 veil.style.cssText='position:absolute;inset:0;background:#f3f5f9;z-index:3;display:flex;align-items:center;justify-content:center;padding:18px';
 veil.innerHTML='<section role="status" aria-live="polite" style="background:white;width:min(100%,420px);border:1px solid #dce4ef;border-radius:16px;padding:24px;box-shadow:0 12px 32px #13284920;font:15px/1.45 system-ui,-apple-system,Arial,sans-serif;color:#17243a"><div style="font-weight:750;font-size:19px;margin-bottom:6px">Формирование PDF</div><p id="pdf-progress-phase" style="margin:0 0 17px;color:#596b80">Подготовка документа…</p><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px"><span style="font-weight:600">Готовность</span><strong id="pdf-progress-percent" style="font-size:21px;font-variant-numeric:tabular-nums">0%</strong></div><div role="progressbar" aria-label="Формирование PDF" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="pdf-progressbar" style="width:100%;height:13px;background:#e7edf5;border-radius:20px;overflow:hidden"><div id="pdf-progress-fill" style="width:0%;height:100%;border-radius:20px;background:#2467cf;transition:width .15s"></div></div><p id="pdf-progress-detail" style="font-size:12px;color:#657187;margin:12px 0 0">Не закрывайте приложение до окончания формирования</p></section>';
 curtain.append(veil);document.body.append(curtain);
 const phase=veil.querySelector('#pdf-progress-phase'),percent=veil.querySelector('#pdf-progress-percent'),bar=veil.querySelector('#pdf-progressbar'),fill=veil.querySelector('#pdf-progress-fill');
 const setProgress=(value,label)=>{const n=Math.max(0,Math.min(100,Math.floor(value)));percent.textContent=n+'%';fill.style.width=n+'%';bar.setAttribute('aria-valuenow',String(n));if(label)phase.textContent=label;};
 return {curtain,message:msg,paper,slot:paper.querySelector('#pdf-page-body'),footer:paper.querySelector('#pdf-page-footer'),setProgress};
}
function pixelsPresent(canvas){
 if(!canvas.width||!canvas.height)return false;
 const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
 for(let i=0;i<data.length;i+=100){if(data[i]<225||data[i+1]<225||data[i+2]<225)return true;}
 return false;
}
async function capture(slot){
 await Promise.all(Array.from(slot.querySelectorAll('img')).map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
 await wait();
 const cv=await window.html2canvas(slot,{scale:1,backgroundColor:'#ffffff',useCORS:true,logging:false,scrollX:0,scrollY:0,windowWidth:690});
 if(!pixelsPresent(cv))throw new Error('Получилось пустое изображение части отчёта');
 return cv;
}
async function build(type,status){
 const entries=chunks(type==='full'?fullReport():conclusionReport());
 if(!entries.some(x=>x.el?.matches('h1')))throw new Error('Не удалось найти заголовок отчёта');
 const {curtain,message,paper,slot,footer,setProgress}=stage();
 setProgress(3,'Разметка страниц отчёта…');
 const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
 let count=0;const bundles=[[]];
 const maxHeight=990; // from top=65 to bottom=1055, above the footer
 try{
  // Measure each block against the actual printable area of one A4 page.
  // Never clip overflowing blocks: move them to the next sheet.
  for(let i=0;i<entries.length;i++){
   const item=entries[i];
   let group=bundles[bundles.length-1];
   if(item.break){
    if(group.length)bundles.push([]);
    slot.replaceChildren();
    continue;
   }
   const block=document.createElement('div');
   block.style.cssText='display:flow-root;margin:0 0 6px 0;width:100%';
   if(item.photos)item.photos.forEach(p=>block.append(p.cloneNode(true)));
   else block.append(item.el.cloneNode(true));
   const appendCurrent=()=>{
    slot.replaceChildren(...group.map(x=>x.cloneNode(true)),block);
   };
   appendCurrent();
   await Promise.all(Array.from(block.querySelectorAll('img')).map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
   // Account for headings: leave enough space for at least the next paragraph.
   const heading=!!item.el?.matches('h1,h2,h3');
   const limit=heading?maxHeight-90:maxHeight;
   if(slot.scrollHeight>limit&&group.length){
    bundles.push([]);group=bundles[bundles.length-1];
    slot.replaceChildren(block);
   }
   // If a single item cannot fit, try smaller photos; never silently crop text.
   if(slot.scrollHeight>maxHeight&&item.photos){
    block.querySelectorAll('img').forEach(im=>im.style.maxHeight='190px');
    await wait();
   }
   if(slot.scrollHeight>maxHeight){
    throw new Error('Блок отчёта не помещается на A4. Разделите длинное описание или таблицу на несколько строк.');
   }
   group.push(block.cloneNode(true));
   if(i%4===0||i===entries.length-1){
    setProgress(3+27*(i+1)/entries.length,'Разметка A4: '+(i+1)+' из '+entries.length+' блоков');
    await wait();
   }
  }
  const pages=bundles.filter(parts=>parts.length);
  if(!pages.length)throw new Error('Документ не содержит страниц');
  for(let i=0;i<pages.length;i++){
   slot.replaceChildren(...pages[i].map(block=>block.cloneNode(true)));footer.textContent='Страница '+(i+1)+' из '+pages.length;
   await Promise.all(Array.from(slot.querySelectorAll('img')).map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
   if(slot.scrollHeight>maxHeight)throw new Error('Переполнение A4 на странице '+(i+1));
   setProgress(30+67*i/pages.length,'Формирование страницы A4 '+(i+1)+' из '+pages.length);
   await wait();
   const canvas=await window.html2canvas(paper,{scale:1.25,backgroundColor:'#ffffff',useCORS:true,logging:false,width:794,height:1123,windowWidth:794,windowHeight:1123});
   if(canvas.width<794||canvas.height<1123)throw new Error('Ошибка изображения страницы '+(i+1));
   // The header is outside the report content; sampled dark pixels prove screenshot is not blank.
   const band=canvas.getContext('2d',{willReadFrequently:true}).getImageData(90,30,500,35).data;
   let dark=0;for(let j=0;j<band.length;j+=4)if(band[j]<190&&band[j+1]<190&&band[j+2]<190)dark++;
   if(dark<10)throw new Error('Пустой снимок страницы '+(i+1));
   if(i)pdf.addPage();
   pdf.addImage(canvas.toDataURL('image/jpeg',0.93),'JPEG',0,0,210,297,undefined,'FAST');
   canvas.width=canvas.height=1;count++;
   setProgress(30+67*count/pages.length,'Готово страниц: '+count+' из '+pages.length);
   await wait();
  }
  setProgress(98,'Сборка итогового PDF…');await wait();
  const blob=pdf.output('blob');
  if(count!==pages.length||blob.size<1500)throw new Error('Не удалось полностью сформировать PDF');
  setProgress(100,'PDF готов');await wait();
  return {blob,pages:count};
 }finally{curtain.remove();}
}
window.preparePDF=async function(type){
 const place=document.getElementById('pdfReady');
 if(!place)return;
 savedBlob=null;place.textContent='Загружаю PDF-модуль и формирую отчёт постранично…';
 const buttons=document.querySelectorAll('[onclick*="preparePDF"]');
 buttons.forEach(b=>b.disabled=true);
 try{
  if(!(await persist()))throw new Error('Не удалось сохранить обследование');
  await libs();
  const {blob,pages}=await build(type);
  savedBlob=blob;
  const slug=String(project.city||project.name||'otchet').replace(/[^а-яА-ЯёЁa-zA-Z0-9_-]/g,'_');
  savedName='ElektroKinoTest_'+slug+'_'+type+'_'+(project.date||'')+'.pdf';
  place.innerHTML='<p><b>Готов PDF:</b> '+pages+' стр., '+(blob.size/1048576).toFixed(1)+' МБ</p><button class="btn" type="button" onclick="savePreparedPDF()">Сохранить PDF на iPhone</button>';
 }catch(e){place.textContent='Ошибка экспорта: '+e.message;}
 finally{buttons.forEach(b=>b.disabled=false);}
};
window.savePreparedPDF=function(){
 if(!savedBlob)return;
 const file=new File([savedBlob],savedName,{type:'application/pdf'});
 if(navigator.canShare?.({files:[file]})){
  navigator.share({files:[file],title:savedName}).catch(e=>{if(e.name!=='AbortError')download(file);});
 }else download(file);
};
function download(file){
 const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
}
})();