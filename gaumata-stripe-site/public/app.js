const cart={};let products=[],activeCategory='Tous',modalProduct=null,modalQty=1,modalView=0;
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(n);
const shapes={'Audio':'round','Objets connectés':'stand','Bureau':'slim','Accessoires':'duo'};
function initials(p){return p.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
function artMarkup(p,large=false,view=0){
  const labels=['01','02','03','04'];
  return `<div class="shape ${shapes[p.category]||''} product-render view-${view}" style="${large?'transform:scale(1.16)':''}">
    <span>${initials(p)}</span><small>${labels[view]||'01'}</small>
  </div>`;
}
async function init(){products=await fetch('/api/products').then(r=>r.json());renderFilters();renderProducts();renderCart()}
function renderFilters(){const cats=['Tous',...new Set(products.map(p=>p.category))];$('#filters').innerHTML=cats.map(c=>`<button class="filter ${c===activeCategory?'active':''}" data-filter="${c}">${c}</button>`).join('');document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.filter;renderFilters();renderProducts()})}
function renderProducts(){
 const list=activeCategory==='Tous'?products:products.filter(p=>p.category===activeCategory);
 $('#productGrid').innerHTML=list.map(p=>`<article class="product-card" data-accent="${p.accent}" data-card="${p.id}" tabindex="0" role="button" aria-label="Voir ${p.name}">
   <div class="product-art">${artMarkup(p)}<span class="product-badge">${p.badge}</span><span class="quick-view" aria-hidden="true">↗</span></div>
   <div class="product-body"><div class="product-meta">${p.category}</div><h3>${p.name}</h3><div class="product-sub">${p.subtitle}</div><div class="product-ref">Réf. ${p.reference}</div>
   <div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${p.id}" aria-label="Ajouter ${p.name}">+</button></div></div></article>`).join('');
 document.querySelectorAll('[data-card]').forEach(card=>{
   card.onclick=e=>{if(!e.target.closest('[data-add]'))openProduct(card.dataset.card)};
   card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('[data-add]')){e.preventDefault();openProduct(card.dataset.card)}}
 });
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();add(b.dataset.add)});
}
function add(id,qty=1){cart[id]=Math.min(10,(cart[id]||0)+qty);renderCart();showToast(qty>1?`${qty} produits ajoutés au panier`:'Produit ajouté au panier')}
function entries(){return Object.entries(cart).filter(([,q])=>q>0)}
function renderCart(){const list=entries(),count=list.reduce((a,[,q])=>a+q,0);$('#cartCount').textContent=count;const total=list.reduce((a,[id,q])=>a+(products.find(p=>p.id===id)?.price||0)*q,0);$('#cartTotal').textContent=money(total);$('#checkoutBtn').disabled=!count;$('#cartBody').innerHTML=list.length?list.map(([id,q])=>{const p=products.find(x=>x.id===id);return `<div class="cart-line"><div class="cart-thumb">${initials(p)}</div><div class="cart-line-main"><b>${p.name}</b><small>${p.reference} · ${money(p.price)} l’unité</small><div class="qty"><button data-dec="${id}">−</button><span>${q}</span><button data-inc="${id}">+</button></div></div><button class="remove" data-remove="${id}">Retirer</button></div>`}).join(''):'<div class="empty-cart"><b>Votre panier est vide.</b><p>Ajoutez un produit de démonstration pour commencer.</p></div>';document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{cart[b.dataset.inc]=Math.min(10,cart[b.dataset.inc]+1);renderCart()});document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{cart[b.dataset.dec]=Math.max(0,cart[b.dataset.dec]-1);renderCart()});document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{delete cart[b.dataset.remove];renderCart()})}
function openCart(){$('#cartShade').hidden=false;requestAnimationFrame(()=>$('#cartDrawer').classList.add('open'));$('#cartDrawer').setAttribute('aria-hidden','false')}
function closeCart(){$('#cartDrawer').classList.remove('open');setTimeout(()=>$('#cartShade').hidden=true,260);$('#cartDrawer').setAttribute('aria-hidden','true')}
function openProduct(id){modalProduct=products.find(x=>x.id===id);modalQty=1;modalView=0;renderModal();$('#productModal').hidden=false}
function renderModal(){
 const p=modalProduct;if(!p)return;
 $('#modalArt').innerHTML=`<div class="gallery-stage">${artMarkup(p,true,modalView)}</div><div class="gallery-thumbs">${p.gallery.map((g,i)=>`<button class="gallery-thumb ${i===modalView?'active':''}" data-gallery="${i}"><span>${initials(p)}</span><small>${g}</small></button>`).join('')}</div>`;
 $('#modalInfo').innerHTML=`<p class="eyebrow">${p.badge} · ${p.category}</p><h2>${p.name}</h2><div class="modal-reference">Référence : <strong>${p.reference}</strong></div><p>${p.description}</p><div class="specs">${p.specs.map(s=>`<span>${s}</span>`).join('')}</div><div class="modal-buy"><div><span class="modal-price-label">Prix démo</span><div class="price">${money(p.price)}</div></div><div class="modal-qty"><span>Quantité</span><div class="qty"><button id="modalDec">−</button><b id="modalQty">${modalQty}</b><button id="modalInc">+</button></div></div></div><button class="primary wide" id="modalAdd">Ajouter ${modalQty} au panier →</button>`;
 document.querySelectorAll('[data-gallery]').forEach(b=>b.onclick=()=>{modalView=Number(b.dataset.gallery);renderModal()});
 $('#modalDec').onclick=()=>{modalQty=Math.max(1,modalQty-1);renderModal()};$('#modalInc').onclick=()=>{modalQty=Math.min(10,modalQty+1);renderModal()};
 $('#modalAdd').onclick=()=>{add(p.id,modalQty);$('#productModal').hidden=true;openCart()};
}
function showToast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>$('#toast').classList.remove('show'),1500)}
$('#cartToggle').onclick=openCart;$('#heroCart').onclick=openCart;$('#cartClose').onclick=closeCart;$('#cartShade').onclick=closeCart;$('#modalClose').onclick=()=>$('#productModal').hidden=true;$('#productModal').onclick=e=>{if(e.target===$('#productModal'))$('#productModal').hidden=true};
$('#checkoutBtn').onclick=()=>{sessionStorage.setItem('aurora-demo-cart',JSON.stringify(entries().map(([id,qty])=>({id,qty}))));location.href='/checkout.html'};
window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();$('#productModal').hidden=true}});
init();