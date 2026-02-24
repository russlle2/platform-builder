document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.getElementById('main-nav');
  if(btn){
    btn.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      if(nav.style.display==='flex') nav.style.display='none'; else nav.style.display='flex';
    });
  }

  // Schedule slot expanders
  var slotButtons=document.querySelectorAll('.slot .btn.small');
  slotButtons.forEach(function(b){
    b.addEventListener('click',function(){
      var times=this.parentNode.querySelector('.times');
      var open = !(times.hidden);
      times.hidden = open;
      this.setAttribute('aria-expanded',!open);
    });
  });

  // Small accessible improvements for details fallback
  if(!('open' in document.createElement('details'))){
    var details = document.querySelectorAll('details');
    details.forEach(function(d){
      var summary = d.querySelector('summary');
      var content = d.querySelector('.answer');
      summary.style.cursor='pointer';
      summary.addEventListener('click',function(){
        var visible = content.style.display==='block';
        content.style.display = visible ? 'none' : 'block';
      });
    });
  }

  // Lightweight anchor smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

});