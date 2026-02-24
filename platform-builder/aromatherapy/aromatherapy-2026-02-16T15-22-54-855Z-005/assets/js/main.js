document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var navToggle=document.getElementById('navToggle');
  var mainNav=document.getElementById('mainNav');
  navToggle&&navToggle.addEventListener('click',function(){
    if(mainNav.style.display==='flex'){mainNav.style.display='none'}else{mainNav.style.display='flex'}
  });

  // FAQ accordion
  var qs=document.querySelectorAll('.faq .qa');
  qs.forEach(function(node){
    var btn=node.querySelector('.q');
    var ans=node.querySelector('.a');
    btn.addEventListener('click',function(){
      var open=ans.style.display==='block';
      // close others
      document.querySelectorAll('.faq .a').forEach(function(x){x.style.display='none'});
      if(!open) ans.style.display='block';
    });
  });

  // Lead magnet form handling (UI only)
  var lead=document.getElementById('leadForm');
  lead&&lead.addEventListener('submit',function(e){
    e.preventDefault();
    var email=(lead.querySelector('input[name="email"]').value||'').trim();
    if(!email||!email.includes('@')){
      alert('Please enter a valid email address to receive the guide.');
      return;
    }
    // simulate success
    lead.querySelector('input[name="email"]').value='';
    alert('Thanks! The safety guide is on its way to ' + email + '.');
  });

  // Insert current year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Basic accessibility: focus outlines for keyboard users
  function handleFirstTab(e){if(e.key==='Tab'){document.body.classList.add('show-focus-outlines');window.removeEventListener('keydown',handleFirstTab)} }
  window.addEventListener('keydown',handleFirstTab);
});