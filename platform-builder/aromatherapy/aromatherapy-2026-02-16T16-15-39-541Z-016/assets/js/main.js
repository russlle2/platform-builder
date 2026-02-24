(function(){
  // Mobile nav
  var navToggle=document.getElementById('navToggle');
  var navList=document.getElementById('navList');
  if(navToggle){navToggle.addEventListener('click',function(){
    var expanded=this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',!expanded);
    navList.classList.toggle('show');
  });}

  // Simple testimonial carousel
  var testi=document.getElementById('testi');
  if(testi){
    var items=testi.querySelectorAll('.testi-item');
    var idx=0;var interval=6000;var timer=null;
    function show(i){items.forEach(function(it){it.classList.remove('active')});items[i].classList.add('active');}
    function next(){idx=(idx+1)%items.length;show(idx);}    
    timer=setInterval(next,interval);
    var btnPrev=document.getElementById('prev');
    var btnNext=document.getElementById('next');
    if(btnPrev)btnPrev.addEventListener('click',function(){clearInterval(timer);idx=(idx-1+items.length)%items.length;show(idx);timer=setInterval(next,interval);});
    if(btnNext)btnNext.addEventListener('click',function(){clearInterval(timer);next();timer=setInterval(next,interval);});
  }

  // Footer year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();