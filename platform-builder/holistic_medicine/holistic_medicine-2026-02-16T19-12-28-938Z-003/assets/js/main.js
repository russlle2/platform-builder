(function(){
  // small interaction bundle: mobile menu + testimonial carousel + year
  var menuBtn=document.querySelector('.menu-toggle');
  var nav=document.querySelector('.main-nav');
  if(menuBtn && nav){
    menuBtn.addEventListener('click',function(){
      var open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!open));
      if(open){nav.style.display='none'}else{nav.style.display='flex'}
    });
  }

  // Testimonials carousel
  var list=document.querySelector('.testimonials-list');
  var items=list?Array.from(list.children):[];
  var idx=0;
  function show(i){
    items.forEach(function(li,j){
      li.setAttribute('aria-hidden', j===i? 'false':'true');
      if(j===i){li.classList.add('active')}else{li.classList.remove('active')}
    });
    list && list.setAttribute('data-index', i);
  }
  if(items.length){
    show(0);
    document.querySelector('.prev').addEventListener('click',function(){idx=(idx-1+items.length)%items.length;show(idx)});
    document.querySelector('.next').addEventListener('click',function(){idx=(idx+1)%items.length;show(idx)});
    // auto rotate
    setInterval(function(){idx=(idx+1)%items.length;show(idx);},7000);
  }

  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // graceful smooth scroll for internal links
  document.addEventListener('click',function(e){
    var t=e.target.closest('a'); if(!t) return;
    if(t.getAttribute('href')&& t.getAttribute('href').startsWith('#')){
      e.preventDefault(); document.querySelector(t.getAttribute('href')).scrollIntoView({behavior:'smooth'});
    }
  });
})();