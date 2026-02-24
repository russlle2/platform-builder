// Minimal interactions for the zen minimal sound bath site
document.addEventListener('DOMContentLoaded',function(){
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Simple accessible toggle for card details (if any)
  document.querySelectorAll('.card').forEach(function(card){
    card.addEventListener('click',function(e){
      // clicking a card highlights it for attention
      document.querySelectorAll('.card').forEach(function(c){c.classList.remove('active')});
      card.classList.add('active');
    });
  });

  // small utility: replace NEXT_EVENT_DATE placeholders if present in data-* attributes
  var nextDate = document.body.getAttribute('data-next-event');
  if(nextDate){
    document.querySelectorAll('*').forEach(function(node){
      if(node.childNodes && node.childNodes.length){
        node.childNodes.forEach(function(n){
          if(n.nodeType===3 && n.nodeValue && n.nodeValue.indexOf('{{NEXT_EVENT_DATE}}')>-1){
            n.nodeValue = n.nodeValue.replace(/\{\{NEXT_EVENT_DATE\}\}/g,nextDate);
          }
        });
      }
    });
  }
});