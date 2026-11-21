/* 0.13.1 — hide unfilled report fields without modifying saved project data. */
(()=>{
'use strict';
const originalShell=reportShell;
const empties=new Set(['','—','Не указаны','Не указан','Не отмечено','Не обследован','Не измерено','Не проводилось']);
const blank=s=>empties.has(String(s??'').trim());
function cleanHTML(body,title){
 const root=document.createElement('div');
 root.innerHTML=body;
 const nodes=Array.from(root.children);
 // Original top-of-report metadata: use only provided object details.
 const firstP=nodes.find(x=>x.matches('p'));
 if(firstP){
  if(title==='Полный технический отчёт'){
   let parts=[project.name,project.city,project.address].filter(v=>String(v??'').trim());
   if(parts.length)firstP.textContent=parts.join(' · ');
   else firstP.remove();
  }else if(title==='Итоговое техническое заключение'){
   const parts=[];
   if([project.name,project.city,project.address].some(v=>String(v??'').trim()))parts.push('Объект: '+[project.name,project.city,project.address].filter(v=>String(v??'').trim()).join(' · '));
   if(String(project.date??'').trim())parts.push('Дата: '+project.date);
   if(inspectors().length)parts.push('Обследующие: '+inspectors().join('; '));
   if(parts.length)firstP.textContent=parts.join('\n');
   else firstP.remove();
  }
 }
 // The original table layout remains intact; remove only rows with no values.
 for(const table of [...root.querySelectorAll('table')]){
  let measureTable=table.rows.length===2&&table.rows[0]?.cells.length===5&&table.rows[0].cells[0].textContent.trim()==='L1';
  if(measureTable){
   const heads=[...table.rows[0].cells],values=[...table.rows[1].cells];
   for(let i=4;i>=0;i--)if(blank(values[i]?.textContent)){heads[i]?.remove();values[i]?.remove();}
   if(!table.rows[1].cells.length)table.remove();
   continue;
  }
  const isChecklist=table.querySelector('thead th')?.textContent.trim()==='№'&&table.querySelectorAll('thead th').length===4;
  if(isChecklist){
   for(const tr of [...table.querySelectorAll('tbody tr')]){
    const status=tr.cells[2]?.textContent.trim(),note=tr.cells[3]?.textContent.trim();
    if(blank(status)&&!note)tr.remove();
    else if(blank(status)&&note)tr.cells[2].textContent='';
   }
  }else{
   for(const tr of [...table.querySelectorAll('tr')]){
    const th=tr.querySelector('th'),td=tr.querySelector('td');
    if(th&&td&&tr.cells.length===2&&blank(td.textContent))tr.remove();
   }
  }
  if(!table.querySelector('tbody tr, tr'))table.remove();
  else if(isChecklist&&!table.querySelector('tbody tr'))table.remove();
  else if(!table.querySelector('td'))table.remove();
 }
 // Empty explanations, unperformed measurements, non-existent photos and findings.
 for(const p of [...root.querySelectorAll('p')]){
  const t=p.textContent.trim();
  if(!t||/^Режим нагрузки:\s*(Не указано|Не выбран|)\.?$/i.test(t)||
     t.startsWith('Дополнительных автоматических предупреждений не сформировано.')||
     t==='Снимков нет.'||t==='Замечаний не зарегистрировано.'||
     t.startsWith('Ограничения отдельно не указаны.'))p.remove();
 }
 // Remove headings which no longer introduce any actual data, and omit absent priorities.
 const headings=[...root.querySelectorAll('h2,h3')];
 for(const h of headings){
  let cursor=h.nextElementSibling,hasData=false;
  while(cursor&&!cursor.matches('h1,h2,h3')){
   if(cursor.matches('table,figure,.photo')||cursor.textContent.trim())hasData=true;
   cursor=cursor.nextElementSibling;
  }
  if(!hasData)h.remove();
 }
 // Avoid blank signature areas when nobody has been named.
 if(!inspectors().length&&!String(project.representative??'').trim())
  root.querySelectorAll('.signature').forEach(x=>x.remove());
 // Remove empty layout containers after filtering.
 for(const section of [...root.querySelectorAll('section.pagebreak')]){
  if(!section.querySelector('table,figure,p,h3'))section.remove();
 }
 return root.innerHTML;
}
reportShell=function(body,title){return originalShell(cleanHTML(body,title),title);};
})();