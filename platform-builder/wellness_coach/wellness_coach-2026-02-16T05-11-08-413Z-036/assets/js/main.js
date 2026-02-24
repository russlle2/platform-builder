(function(){document.getElementById('year').textContent=new Date().getFullYear();
// Mobile nav toggle
var toggle=document.querySelector('.mobile-toggle');var nav=document.getElementById('nav');if(toggle){toggle.addEventListener('click',function(){var expanded=this.getAttribute('aria-expanded')==='true';this.setAttribute('aria-expanded',!expanded);if(nav.style.display==='block'){nav.style.display='';}else{nav.style.display='block';}});}n=document.getElementById('magnetForm');if(n){n.addEventListener('submit',function(e){e.preventDefault();var email=(document.getElementById('email')||{}).value||'';if(!email||!/\S+@\S+\.\S+/.test(email)){alert('Please provide a valid email.');return;} // faux-submit: redirect to CTA with email as query
var cta='{{PRIMARY_CTA_URL}}';try{if(cta&&cta!==''){
  var url=new URL(cta,window.location.href);url.searchParams.set('email',email);window.location.href=url.toString();return;
}
}catch(err){}
// fallback: open mailto
window.location.href='mailto:{{EMAIL}}?subject=Guide%20Request&body=Please%20send%20the%20guide%20to%20'+encodeURIComponent(email);
});}
})();