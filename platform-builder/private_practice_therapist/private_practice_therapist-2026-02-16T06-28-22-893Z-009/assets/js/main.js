(function(){
  // Minimal interaction: small analytics-free behavior for buttons
  document.addEventListener('click',function(e){
    var t=e.target.closest && e.target.closest('a.button');
    if(!t) return;
    var href=t.getAttribute('href');
    if(href && href.indexOf('#')!==0 && href.indexOf('mailto:')!==0 && href.indexOf('http')!==0){
      // simulate gentle client-side confirmation for booking
      if(href.indexOf('{{PRIMARY_CTA_URL}}')!==-1 || href.indexOf('book.html')!==-1){
        // allow navigation but record to sessionStorage as lightweight note
        try{sessionStorage.setItem('last_action','clicked_book');}catch(e){}
      }
    }
  });

  // Accessibility: focus outline for keyboard users
  document.addEventListener('keydown',function(e){
    if(e.key==='Tab') document.body.classList.add('show-focus');
  });
})();