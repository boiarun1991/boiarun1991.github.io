/* ElektroKinoTest 0.12.7: safe paged PDF export using original report HTML */
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
 curtain.style.cssText='position:fixed;inset:0;background:#f7f9fc;z-index:2147483640;overflow:hidden;';
 const message=document.createElement('div');
 message.style.cssText='position:absolute;right:10px;top:10px;background:#14315a;color:white;padding:9px 14px;border-radius:9px;font:14px Arial;z-index:2';
 message.textContent='Подготовка страниц PDF…';
 curtain.append(message);
 const host=document.createElement('div');
 host.style.cssText='position:absolute;left:0;top:0;width:690px;background:white;padding:0;color:#1b2737;font:13.3px/1.42 Arial,sans-serif;';
 host.innerHTML='<style>*,*:before,*:after{box-sizing:border-box}h1{font-size:25px;line-height:1.18;letter-spacing:-.2px;margin:0 0 18px}h2{font-size:17px;margin:18px 0 9px;border-bottom:1px solid #b6c4d4;padding-bottom:5px}h3{font-size:14.3px;margin:15px 0 6px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 10px}table{border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0 12px;font-size:11.3px}td,th{border:1px solid #b7c1cf;padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eff3f7;font-weight:600}small{color:#596b80}.photo{display:inline-block;width:46%;margin:6px 1%;vertical-align:top}.photo img{display:block;width:100%;max-height:280px;object-fit:contain}.photo figcaption{font-size:11.3px;overflow-wrap:anywhere}</style><div id="page-content"></div>';
 curtain.append(host);document.body.append(curtain);
 return {curtain,message,slot:host.querySelector('#page-content')};
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
 if(!entries.some(x=>x.el?.matches('h1')))throw new Error('Нет заголовка отчёта');
 const {curtain,message,slot}=stage();
 const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
 const paperWidth=180, left=15, top=14,bottom=283;
 let y=top,pages=1,written=0;
 try{
  for(let i=0;i<entries.length;i++){
   const item=entries[i];
   if(item.break){if(y>top+5){pdf.addPage();pages++;y=top;}continue;}
   slot.replaceChildren();
   if(item.photos){item.photos.forEach(n=>slot.append(n));}
   else slot.append(item.el);
   message.textContent='Создание PDF: '+(i+1)+' / '+entries.length+' блоков';
   const c=await capture(slot);
   const mmH=c.height*paperWidth/c.width;
   if(y+mmH>bottom&&y>top){pdf.addPage();pages++;y=top;}
   const room=bottom-y;
   if(mmH<=room){
    pdf.addImage(c.toDataURL('image/jpeg',0.88),'JPEG',left,y,paperWidth,mmH,undefined,'FAST');y+=mmH+2;written++;
   }else{
    // Tall blocks are split into actual page-sized image slices to avoid white PDF pages.
    let from=0,remaining=c.height;
    while(remaining>0){
     const available=(bottom-y)*c.width/paperWidth;
     const pixels=Math.min(remaining,Math.max(1,Math.floor(available)));
     const part=document.createElement('canvas');
     part.width=c.width;part.height=pixels;
     part.getContext('2d').drawImage(c,0,from,c.width,pixels,0,0,c.width,pixels);
     pdf.addImage(part.toDataURL('image/jpeg',0.88),'JPEG',left,y,paperWidth,pixels*paperWidth/c.width,undefined,'FAST');
     written++;from+=pixels;remaining-=pixels;
     if(remaining>0){pdf.addPage();pages++;y=top;}else y+=pixels*paperWidth/c.width+2;
    }
   }
   if(i%4===0)await wait();
  }
  if(!written)throw new Error('Не удалось создать страницы отчёта');
  const blob=pdf.output('blob');
  if(blob.size<1200)throw new Error('PDF получился слишком маленьким');
  return {blob,pages};
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