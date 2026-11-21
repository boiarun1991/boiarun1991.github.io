/* 0.12.4: export with original HTML report styling */
(()=>{
'use strict';
let savedBlob=null,savedName='';
const CDN='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
function loadLibrary(win){
 return new Promise((resolve,reject)=>{
  if(win.html2pdf)return resolve();
  const s=win.document.createElement('script');s.src=CDN;
  s.onload=()=>win.html2pdf?resolve():reject(new Error('Модуль PDF не запустился'));
  s.onerror=()=>reject(new Error('Не удалось загрузить модуль PDF. Проверьте интернет'));
  win.document.head.appendChild(s);
 });
}
function newFrame(markup){
 const frame=document.createElement('iframe');
 frame.setAttribute('aria-hidden','true');
 frame.style.cssText='position:fixed;top:0;left:-10000px;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-1';
 document.body.appendChild(frame);
 const doc=frame.contentDocument;
 doc.open();doc.write(markup);doc.close();
 const style=doc.createElement('style');
 style.textContent='html{background:#fff!important}body{max-width:none!important;width:794px!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;background:white!important;font:10pt/1.42 Arial,sans-serif!important}.report-tools,button.print{display:none!important}h1,h2,h3{break-after:avoid;page-break-after:avoid}tr,.photo,.signature{break-inside:avoid;page-break-inside:avoid}.photo{display:inline-block!important;width:46%!important;margin:2mm 1%!important}.photo img{max-height:74mm!important;width:100%!important;object-fit:contain}.pagebreak{break-before:page;page-break-before:always}';
 doc.head.append(style);
 doc.querySelectorAll('.report-tools,button.print').forEach(x=>x.remove());
 return frame;
}
async function imageReady(doc){
 await Promise.all(Array.from(doc.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
}
async function createOriginalPDF(type){
 const frame=newFrame(type==='full'?fullReport():conclusionReport());
 try{
  const win=frame.contentWindow,doc=frame.contentDocument;
  await loadLibrary(win);
  await imageReady(doc);
  await new Promise(r=>setTimeout(r,100));
  const options={
   margin:[14,15,14,15],
   filename:'report.pdf',
   image:{type:'jpeg',quality:0.89},
   html2canvas:{scale:1.45,useCORS:true,backgroundColor:'#ffffff',logging:false,scrollY:0,windowWidth:794},
   jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
   pagebreak:{mode:['css','legacy'],before:'.pagebreak',avoid:['tr','.photo','.signature','h2','h3']}
  };
  const blob=await win.html2pdf().set(options).from(doc.body).outputPdf('blob');
  if(!blob||blob.size<100)throw new Error('Пустой PDF');
  return blob;
 }finally{frame.remove();}
}
window.preparePDF=async function(type){
 const div=document.getElementById('pdfReady');if(!div)return;
 const buttons=document.querySelectorAll('[onclick*="preparePDF"]');
 buttons.forEach(b=>b.disabled=true);
 div.textContent='Создаю PDF в прежнем оформлении. Большой отчёт с фотографиями может обрабатываться несколько минут…';
 try{
  if(!(await persist()))throw new Error('Не удалось сохранить данные перед экспортом');
  savedBlob=await createOriginalPDF(type);
  const safe=String(project.city||project.name||'otchet').replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g,'_');
  savedName='ElektroKinoTest_'+safe+'_'+type+'_'+(project.date||'')+'.pdf';
  div.innerHTML='<p><b>PDF готов:</b> '+(savedBlob.size/1048576).toFixed(1)+' МБ</p><button type="button" class="btn" onclick="savePreparedPDF()">Сохранить PDF на iPhone</button>';
 }catch(e){
  savedBlob=null;
  div.textContent='Не удалось создать PDF: '+e.message+'. Для этой выгрузки требуется интернет при первой загрузке модуля.';
 }finally{buttons.forEach(b=>b.disabled=false);}
};
window.savePreparedPDF=function(){
 if(!savedBlob)return;
 const f=new File([savedBlob],savedName,{type:'application/pdf'});
 if(navigator.canShare?.({files:[f]}))navigator.share({files:[f],title:savedName}).catch(e=>{if(e.name!=='AbortError')download(f);});
 else download(f);
};
function download(f){
 const url=URL.createObjectURL(f),a=document.createElement('a');
 a.href=url;a.download=f.name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
})();