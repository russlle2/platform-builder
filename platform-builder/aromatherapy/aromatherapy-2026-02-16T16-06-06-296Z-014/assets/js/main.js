document.addEventListener('DOMContentLoaded',function(){
  // Nav toggle for small screens
  var nav=document.getElementById('mainNav');
  var toggle=document.getElementById('navToggle');
  toggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';}
  });

  // FAQ accordion
  var accordions=document.querySelectorAll('.accordion .qa');
  accordions.forEach(function(qa){
    var btn=qa.querySelector('.q');
    var ans=qa.querySelector('.a');
    btn.addEventListener('click',function(){
      var open=document.querySelector('.accordion .a[style*="display: block"]');
      if(open && open!==ans){open.style.display='none';}
      ans.style.display=(ans.style.display==='block')? 'none':'block';
    });
  });

  // Simple carousel for case notes
  var track=document.querySelector('.carousel-track');
  var prev=document.querySelector('.carousel-btn.prev');
  var next=document.querySelector('.carousel-btn.next');
  if(track){
    var index=0;var items=track.children.length;
    function update(){
      var w=track.children[0].getBoundingClientRect().width+16; // gap
      track.style.transform='translateX('+(-index*w)+'px)';
      track.style.transition='transform 400ms ease';
    }
    prev.addEventListener('click',function(){index=(index-1+items)%items;update();});
    next.addEventListener('click',function(){index=(index+1)%items;update();});
    window.addEventListener('resize',update);
  }

  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
});