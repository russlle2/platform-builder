document.addEventListener('DOMContentLoaded',function(){
  // Menu toggle for small screens
  var btn=document.querySelector('.menu-toggle');
  var nav=document.querySelector('.nav');
  if(btn&&nav){btn.addEventListener('click',function(){nav.style.display=(nav.style.display==='flex')?'none':'flex';});}

  // FAQ accordion
  var qs=document.querySelectorAll('.accordion .q');
  qs.forEach(function(q){q.addEventListener('click',function(){
    var a=q.nextElementSibling; var open= a.style.display==='block';
    document.querySelectorAll('.accordion .a').forEach(function(x){x.style.display='none'});
    a.style.display = open? 'none':'block';
  })});

  // Lead magnet form
  var form=document.getElementById('leadForm');
  if(form){form.addEventListener('submit',function(e){
    e.preventDefault();
    var fdata=new FormData(form); var name=fdata.get('name')||''; var email=fdata.get('email')||'';
    if(!email.match(/@/)){alert('Please enter a valid email.');return}
    // store locally as a simple mock for server
    var leads = JSON.parse(localStorage.getItem('leads')||'[]');
    leads.push({name:name,email:email,date:new Date().toISOString()});
    localStorage.setItem('leads',JSON.stringify(leads));
    form.reset();
    alert('Thanks — your guide will arrive shortly.');
  })}

});