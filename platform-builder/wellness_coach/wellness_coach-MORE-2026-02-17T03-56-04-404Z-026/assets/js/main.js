(function(){
  // Populate year
  document.addEventListener('DOMContentLoaded',function(){
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // Testimonials rotation
    var quotes=document.querySelectorAll('.testimonials .quote');
    var idx=0; function show(i){quotes.forEach(function(q){q.classList.remove('show')});quotes[i].classList.add('show')}
    if(quotes.length){ show(0); var rot=setInterval(function(){ idx=(idx+1)%quotes.length; show(idx); },5000);
      document.getElementById('prevQuote').addEventListener('click',function(){ clearInterval(rot); idx=(idx-1+quotes.length)%quotes.length; show(idx); });
      document.getElementById('nextQuote').addEventListener('click',function(){ clearInterval(rot); idx=(idx+1)%quotes.length; show(idx); });
    }

    // Badge tooltip
    var badges=document.querySelectorAll('.badge');
    var tt=document.getElementById('badgeTooltip');
    badges.forEach(function(b){
      b.addEventListener('mouseover',function(e){ var tip=b.getAttribute('data-tip'); if(!tip) return; tt.textContent=tip; tt.style.display='block'; tt.setAttribute('aria-hidden','false'); var r=b.getBoundingClientRect(); var parent=document.querySelector('.credibility'); var pr=parent.getBoundingClientRect(); tt.style.left=(r.left-pr.left)+'px'; tt.style.top=(r.bottom-pr.top+8)+'px'; });
      b.addEventListener('mouseout',function(){ tt.style.display='none'; tt.setAttribute('aria-hidden','true'); });
    });

    // Pricing comparator
    var toggleBtns=document.querySelectorAll('.toggle-btn');
    var priceEls=document.querySelectorAll('.price');
    function animatePrice(el,from,to){
      var start=+from; var end=+to; var dur=420; var startTime=Date.now(); var raf=function(){ var now=Date.now(); var t=Math.min(1,(now-startTime)/dur); var val=Math.round(start+(end-start)*t); el.textContent='$'+val; if(t<1) requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    toggleBtns.forEach(function(btn){ btn.addEventListener('click', function(){ toggleBtns.forEach(function(b){b.classList.remove('active');b.setAttribute('aria-pressed','false')}); btn.classList.add('active'); btn.setAttribute('aria-pressed','true'); var mode=btn.getAttribute('data-mode'); priceEls.forEach(function(pe){ var current=pe.textContent.replace(/[^0-9]/g,'')||'0'; var target=pe.getAttribute('data-'+mode); animatePrice(pe,current,target); }); }); });

    // Mobile menu
    var mt=document.querySelector('.mobile-toggle'); if(mt){ mt.addEventListener('click',function(){ var nav=document.querySelector('.main-nav'); if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';}}); }
  });
})();