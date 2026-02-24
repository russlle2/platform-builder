document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // mobile nav toggle
  var toggle=document.querySelector('.nav-toggle');
  var list=document.getElementById('nav-list');
  if(toggle && list){
    toggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', (!expanded).toString());
      if(list.style.display === 'flex'){
        list.style.display = 'none';
      } else {
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
      }
    });
  }

  // Symptom checklist review
  var reviewBtn=document.getElementById('symptom-review');
  var form=document.getElementById('symptom-check');
  if(reviewBtn && form){
    reviewBtn.addEventListener('click',function(){
      var checks = form.querySelectorAll('input[type=checkbox]');
      var names=[];
      checks.forEach(function(c){ if(c.checked) names.push(c.parentNode.textContent.trim()); });
      if(names.length===0){ alert('No items selected. Choose any items that reflect your current concerns.'); return; }
      alert('You selected:\n- ' + names.join('\n- ') + '\n\nThis summary is to help your conversation; it is not a diagnosis.');
    });

    form.addEventListener('submit',function(e){
      e.preventDefault();
      // simple simulated share
      alert('Thank you. Your checklist will be shared with the practitioner ahead of your visit.');
    });
  }

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); }
    });
  });
});