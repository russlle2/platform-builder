document.addEventListener('DOMContentLoaded',function(){
  var y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth'});
    });
  });
});
