(function(){
  // simple nav toggle and year injection
  var toggle=document.getElementById('navToggle');
  var links=document.getElementById('navLinks');
  if(toggle && links){
    toggle.addEventListener('click',function(){
      links.classList.toggle('show');
    });
  }
  var y=document.getElementById('year');
  if(y){ y.textContent=new Date().getFullYear(); }
  // quick smooth scroll for in-page anchors
  document.addEventListener('click',function(e){
    var t=e.target; while(t && t.tagName!=='A') t=t.parentElement;
    if(t && t.getAttribute && t.getAttribute('href') && t.getAttribute('href').startsWith('#')){
      e.preventDefault(); document.querySelector(t.getAttribute('href'))?.scrollIntoView({behavior:'smooth'});
    }
  });
})();