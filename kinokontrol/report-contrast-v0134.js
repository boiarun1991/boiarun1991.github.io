/* v0.13.4: readable report tables and natural photo proportions in HTML previews */
(()=>{
'use strict';
const previous=reportShell;
const css='<style>body{color:#18283d}body h1,body h2,body h3{color:#193451}body h2{border-bottom-color:#a7b6ca}body table td,body table th{border-color:#94a3b8;color:#1c2c42}body table th{background:#e7edf5;color:#1b334f;font-weight:700}body table tbody tr:nth-child(even){background:#f7f9fc}body figure.photo img{display:block;width:auto;height:auto;max-width:100%;max-height:74mm;object-fit:contain;object-position:left top}body figure.photo{break-inside:avoid}</style>';
reportShell=function(body,title){
 const report=previous(body,title);
 return report.replace('</head>',css+'</head>');
};
})();