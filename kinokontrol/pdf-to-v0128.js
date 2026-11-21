/* ElektroKinoTest 0.12.8: Отчёт ТО fixed-A4-page PDF export using original report HTML */
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
 const table=el.cloneNode(true);
 const head=Array.from(table.querySelectorAll('thead tr'));
 const body=Array.from(table.querySelectorAll('tbody > tr'));
 const rows=body.length?body:Array.from(table.querySelectorAll(':scope > tr'));
 if(rows.length<=7)return [table];
 return Array.from({length:Math.ceil(rows.length/6)},(_,i)=>{
  const t=table.cloneNode(false);
  t.style.width='100%';
  if(head.length){const h=document.createElement('thead');head.forEach(r=>h.append(r.cloneNode(true)));t.append(h);}
  const b=document.createElement('tbody');
  rows.slice(i*6,(i+1)*6).forEach(r=>b.append(r.cloneNode(true)));
  t.append(b);return t;
 });
}
function chunks(markup){
 const parsed=new DOMParser().parseFromString(markup,'text/html'),nodes=[];
 function add(n){
  if(n.nodeType!==1)return;
  if(n.matches('.report-tools,button.print,script,style'))return;
  if(n.matches('section.pagebreak')){nodes.push({break:true});Array.from(n.children).forEach(add);return;}
  if(n.matches('table')){splitTable(n).forEach(el=>nodes.push({el}));return;}
  if(n.matches('p')&&n.textContent.length>950){
    const str=n.textContent;
    for(let at=0;at<str.length;at+=650){const p=n.cloneNode(false);p.textContent=str.slice(at,at+650);nodes.push({el:p});}
    return;
  }
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
 msg.textContent='Подготовка PDF…';curtain.append(msg);
 const paper=document.createElement('div');
 paper.style.cssText='position:absolute;top:0;left:0;width:794px;height:1123px;background:white;color:#1b2737;overflow:hidden;box-sizing:border-box';
 const style=document.createElement('style');
 style.textContent=' #pdf-page-body{font:13.3px/1.42 Arial,sans-serif;width:680px;color:#1b2737}#pdf-page-body *,#pdf-page-body *:before,#pdf-page-body *:after{box-sizing:border-box}#pdf-page-body h1{font-size:25px;line-height:1.18;margin:0 0 18px}#pdf-page-body h2{font-size:17px;margin:18px 0 9px;border-bottom:1px solid #b6c4d4;padding-bottom:5px}#pdf-page-body h3{font-size:14.3px;margin:15px 0 6px}#pdf-page-body p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 10px}#pdf-page-body table{border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0 12px;font-size:11.3px}#pdf-page-body td,#pdf-page-body th{border:1px solid #b7c1cf;padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}#pdf-page-body th{background:#eff3f7;font-weight:600}#pdf-page-body small{color:#596b80}#pdf-page-body .photo{display:inline-block;width:46%;margin:6px 1%;vertical-align:top}#pdf-page-body .photo img{display:block;width:100%;max-height:280px;object-fit:contain}#pdf-page-body .photo figcaption{font-size:11px;overflow-wrap:anywhere}';
 paper.innerHTML='<div style="position:absolute;top:20px;left:57px;right:57px;border-bottom:1px solid #d6dfe9;padding-bottom:8px;font:12px Arial;color:#40546f">ЭлектроКиноТест · Акт обследования электрооборудования</div><div id="pdf-page-body" style="position:absolute;top:65px;left:57px;width:680px"></div><div id="pdf-page-footer" style="position:absolute;bottom:20px;left:57px;right:57px;border-top:1px solid #d6dfe9;padding-top:6px;font:11px Arial;color:#617289"></div>';
 curtain.append(style,paper);document.body.append(curtain);
 return {curtain,message:msg,paper,slot:paper.querySelector('#pdf-page-body'),footer:paper.querySelector('#pdf-page-footer')};
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
 const {curtain,message,paper,slot,footer}=stage();
 const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
 let count=0;const bundles=[[]];
 const maxHeight=990;
 try{
  // Compose fixed-height portrait A4 sheets as in Отчёт ТО, not a giant screenshot.
  for(let i=0;i<entries.length;i++){
   const item=entries[i],current=bundles[bundles.length-1];
   if(item.break){if(current.length)bundles.push([]);slot.replaceChildren();continue;}
   const block=document.createElement('div');block.style.cssText='display:flow-root;margin:0 0 6px';
   if(item.photos)item.photos.forEach(p=>block.append(p.cloneNode(true)));
   else block.append(item.el.cloneNode(true));
   slot.append(block);
   await Promise.all(Array.from(block.querySelectorAll('img')).map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
   if(slot.scrollHeight>maxHeight&&current.length){
    bundles.push([]);slot.replaceChildren(block);
   }
   if(slot.scrollHeight>maxHeight){
    // Photo-heavy items stay complete; shrink a single oversize photo block.
    block.querySelectorAll('img').forEach(im=>im.style.maxHeight='160px');
   }
   bundles[bundles.length-1].push(block.cloneNode(true));
   if(i%8===0){message.textContent='Разметка: '+(i+1)+' из '+entries.length;await wait();}
  }
  const pages=bundles.filter(parts=>parts.length);
  if(!pages.length)throw new Error('Документ не содержит страниц');
  for(let i=0;i<pages.length;i++){
   slot.replaceChildren(...pages[i]);footer.textContent='Страница '+(i+1)+' из '+pages.length;
   await Promise.all(Array.from(slot.querySelectorAll('img')).map(im=>im.decode?.().catch(()=>{})||Promise.resolve()));
   message.textContent='Формирование: страница '+(i+1)+' из '+pages.length;
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
  }
  const blob=pdf.output('blob');
  if(count!==pages.length||blob.size<1500)throw new Error('Не удалось полностью сформировать PDF');
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