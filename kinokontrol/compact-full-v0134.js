/* 0.13.4 compact full report, preserve explicit page breaks */
(()=>{
'use strict';
fullReport=function compactFullReport(){
 const valid=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
 const cell=v=>html(String(v??''));
 const r=(label,v)=>valid(v)?row(label,v):'';
 const st=countStats();
 const intro=[project.name,project.city,project.address].filter(valid).map(cell).join(' · ');
 let body='<h1>Акт обследования электрооборудования кинотеатра</h1>';
 if(intro)body+='<p>'+intro+'</p>';
 body+='<table>'+r('Дата',project.date)+r('Обследующие',inspectors().join('; '))+r('Представитель объекта',project.representative)+r('Объём обследования',project.scope)+r('Ограничения',project.limitations)+'</table>';
 body+='<p>Электрощитов: '+st.panels+'; обследовано: '+st.checked+'; замечаний: '+project.findings.length+'; фотографий: '+st.photos+'.</p>';
 if(project.findings.length){
  const grouped=new Map();
  for(const f of project.findings){
   const h=findHall(f.hallId),p=h?.panels.find(x=>x.id===f.panelId),name=p?boardName(h,p):'Щит не указан';
   const rec=grouped.get(name)||{name,high:0,medium:0,low:0,other:0};
   if(f.priority==='p1')rec.high++;else if(f.priority==='p2')rec.medium++;else if(f.priority==='p3')rec.low++;else rec.other++;
   grouped.set(name,rec);
  }
  body+='<h2>Сводная ведомость замечаний</h2><table><thead><tr><th>Электрощит</th><th>Высокий</th><th>Средний</th><th>Низкий</th></tr></thead><tbody>';
  for(const g of grouped.values())body+='<tr><td>'+cell(g.name)+'</td><td>'+g.high+'</td><td>'+g.medium+'</td><td>'+g.low+'</td></tr>';
  body+='</tbody></table>';
 }
 for(const h of project.halls){
  if(!h.panels.length)continue;
  body+='<section class="pagebreak"><h2>Обследование электрощитов</h2>';
  for(const p of h.panels){
   body+='<h3>'+(p.kind==='object'?'Объект':'Электрощит')+': '+cell(boardName(h,p))+'</h3>';
   const panelInfo=[
    r('Расположение',p.location),
    r('Статус',p.inspection&&p.inspection!=='notdone'?statusWord(p.inspection):''),
    r('Вводной автомат, А',p.inputBreaker),
    r('Тип защиты',p.breakerType),r('Примечания',p.notes)
   ].filter(Boolean).join('');
   if(panelInfo)body+='<table>'+panelInfo+'</table>';
   const performed=[];
   for(let i=0;i<CHECKS.length;i++){
    const v=p.check[i]||{};
    const hasStatus=valid(v.status)&&v.status!=='notdone';
    if(!hasStatus&&!valid(v.note))continue;
    performed.push('<tr><td>'+cell(CHECKS[i][1])+'</td><td>'+(hasStatus?cell(statusWord(v.status)):'')+'</td><td>'+cell(v.note||'')+'</td></tr>');
   }
   if(performed.length)body+='<h3>Визуальный осмотр</h3><table><thead><tr><th>Проверка</th><th>Результат</th><th>Примечание</th></tr></thead><tbody>'+performed.join('')+'</tbody></table>';
   const measured=['l1','l2','l3','n','pe'].filter(k=>valid(p.measures[k]));
   if(measured.length){
    body+='<h3>Токи токовых клещей, А</h3><table><thead><tr>'+measured.map(k=>'<th>'+k.toUpperCase()+'</th>').join('')+'</tr></thead><tbody><tr>'+measured.map(k=>'<td>'+cell(p.measures[k])+'</td>').join('')+'</tr></tbody></table>';
   }
   if(valid(p.measures.mode)&&p.measures.mode!=='none')body+='<p>Режим нагрузки: '+cell(loadMode(p.measures.mode))+'.</p>';
   const alerts=evaluate(p).alerts.map(x=>x.text).filter(Boolean);
   if(alerts.length)body+='<p>'+cell(alerts.join(' '))+'</p>';
   const thermal=[
    p.thermal.status&&p.thermal.status!=='notdone'?r('Статус',statusWord(p.thermal.status)):'',
    r('Температура окружающей среды, °C',p.thermal.ambient),
    r('Максимальная температура, °C',p.thermal.maxTemp),
    r('Комментарий',p.thermal.comment)
   ].filter(Boolean).join('');
   if(thermal)body+='<h3>Тепловизионное обследование</h3><table>'+thermal+'</table>';
   const found=project.findings.filter(f=>f.hallId===h.id&&f.panelId===p.id);
   if(found.length)body+='<h3>Замечания по щиту</h3>'+findingTable(found,true);
   const photos=project.photos.filter(x=>x.hallId===h.id&&x.panelId===p.id);
   if(photos.length)body+='<h3>Фотофиксация</h3>'+photoReport(photos);
  }
  body+='</section>';
 }
 body+='<div class="signature">'+signatures()+'</div><p><small>Обследование проводится без отключения и вмешательства в электрооборудование. Документ отражает только внесённые результаты фактически выполненных работ и не заменяет протоколы специализированных испытаний.</small></p>';
 const output=reportShell(body,'Полный технический отчёт');
 const compactCSS='<style>body h2{margin:4mm 0 2mm;padding-bottom:1.5mm}body h3{margin:3mm 0 1.5mm}body table{margin:1.2mm 0 2mm;font-size:8pt}body td,body th{padding:1.1mm 1.5mm;border-color:#94a3b8;color:#1c2c42}body th{background:#e7edf5;color:#1b334f;font-weight:700}body tbody tr:nth-child(even){background:#f7f9fc}body h1,body h2,body h3{color:#193451}body p{margin:1.3mm 0 2mm}body .photo{margin:1mm 1%;width:46%}body .photo img{display:block;width:auto;height:auto;max-width:100%;max-height:53mm;object-fit:contain;object-position:left top}body .photo figcaption{font-size:8pt}</style>';
 return output.replace('</head>',compactCSS+'</head>');
};
})();