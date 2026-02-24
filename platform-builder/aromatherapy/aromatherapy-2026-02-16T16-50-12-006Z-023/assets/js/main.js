document.addEventListener('DOMContentLoaded',function(){
  // year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // menu toggle for small screens
  var menu=document.getElementById('menuToggle'); var nav=document.getElementById('nav');
  if(menu && nav){
    menu.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      nav.classList.toggle('open');
    });
  }

  // basic testimonial rotator
  var testi=document.getElementById('testimonials');
  if(testi){
    var i=0; var blocks=testi.querySelectorAll('blockquote');
    if(blocks.length>1){
      blocks.forEach(function(b,idx){ if(idx!==0) b.style.display='none'; });
      setInterval(function(){ blocks[i].style.display='none'; i=(i+1)%blocks.length; blocks[i].style.display='block'; },5000);
    }
  }
});
