const LS = {
  items:'stylemate_items_v1', outfits:'stylemate_outfits_v1', wishlist:'stylemate_wishlist_v1', config:'stylemate_config_v1'
};
let state = { items: [], outfits: [], wishlist: [], config: {}, supabase: null };

const starterItems = [
 {name:'Douglas Hayward navy blazer',brand:'Douglas Hayward',category:'Blazer / Jacket',colour:'Navy',occasion:'Smart casual, dinner, night out',season:'All year',notes:'Premium smart casual anchor piece.'},
 {name:'Farrell blazer',brand:'Farrell',category:'Blazer / Jacket',colour:'Navy / dark',occasion:'Smart casual, pub, dinner',season:'All year',notes:'Good second blazer option.'},
 {name:'North Face jacket',brand:'The North Face',category:'Blazer / Jacket',colour:'Dark',occasion:'Casual, walking, wet weather',season:'Autumn / Winter',notes:'Practical casual layer.'},
 {name:'Henri Lloyd jacket',brand:'Henri Lloyd',category:'Blazer / Jacket',colour:'Dark',occasion:'Casual, weekend',season:'Spring / Autumn',notes:'Classic casual jacket.'},
 {name:'Jack & Jones hoodie',brand:'Jack & Jones',category:'Top',colour:'Dark',occasion:'Casual, weekend',season:'All year',notes:'Relaxed casual layer.'},
 {name:'Paul Costelloe navy T-shirt',brand:'Paul Costelloe',category:'Top',colour:'Navy',occasion:'Smart casual, weekend',season:'Spring / Summer',notes:'Works under blazer.'},
 {name:'Navy jeans',brand:'',category:'Jeans / Trousers',colour:'Navy',occasion:'Smart casual, casual, pub',season:'All year',notes:'Core trouser option.'},
 {name:'Clarks Wallabees',brand:'Clarks',category:'Shoes / Boots',colour:'Brown',occasion:'Smart casual, pub, dinner',season:'All year',notes:'Great with navy jeans and blazer.'},
 {name:'Brown Doc Martens',brand:'Dr. Martens',category:'Shoes / Boots',colour:'Brown',occasion:'Casual, smart casual',season:'Autumn / Winter',notes:'Strong rugged option.'},
 {name:'Black canvas Doc Martens',brand:'Dr. Martens',category:'Shoes / Boots',colour:'Black',occasion:'Casual, gigs, pub',season:'All year',notes:'Modern casual boot.'},
 {name:'Citizen Eagle 7',brand:'Citizen',category:'Watch',colour:'Silver / blue',occasion:'Everyday, smart casual',season:'All year',notes:'Reliable automatic watch.'},
 {name:'Fossil watch',brand:'Fossil',category:'Watch',colour:'Brown / silver',occasion:'Casual, smart casual',season:'All year',notes:'Good casual watch option.'},
 {name:'Leather belt',brand:'',category:'Belt / Accessory',colour:'Brown',occasion:'Smart casual',season:'All year',notes:'Pairs with brown shoes.'}
];
const starterWishlist = ['Forest green Harrington','White trainers','Blue-dial watch','Ray-Ban sunglasses'].map(name=>({id:crypto.randomUUID(),name,category:'Wishlist',notes:'Discussed for Style Mate'}));

document.addEventListener('DOMContentLoaded', init);
function init(){
  loadLocal(); initSupabase(); bind(); renderAll();
}
function bind(){
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  $('saveConfigBtn').onclick=saveConfig; $('testConfigBtn').onclick=testCloud; $('showSetupBtn').onclick=()=>$('setupCard').classList.toggle('hidden');
  $('saveItemBtn').onclick=saveItem; $('clearFormBtn').onclick=clearForm; $('syncBtn').onclick=syncCloud;
  $('search').oninput=renderItems; $('filterCategory').onchange=renderItems;
  $('quickOutfitBtn').onclick=()=>{showTab('outfits'); generateOutfit();}; $('generateOutfitBtn').onclick=generateOutfit;
  $('addWishBtn').onclick=addWish; $('seedBtn').onclick=seedStarter; $('exportBtn').onclick=exportBackup; $('importFile').onchange=importBackup;
}
function $(id){return document.getElementById(id)}
function showTab(tab){document.querySelectorAll('.tab').forEach(s=>s.classList.remove('active'));$(tab).classList.add('active');document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));}
function loadLocal(){
  state.items = JSON.parse(localStorage.getItem(LS.items)||'[]');
  state.outfits = JSON.parse(localStorage.getItem(LS.outfits)||'[]');
  state.wishlist = JSON.parse(localStorage.getItem(LS.wishlist)||'[]');
  state.config = JSON.parse(localStorage.getItem(LS.config)||'{}');
  $('supabaseUrl').value = state.config.url || ''; $('supabaseKey').value = state.config.key || '';
  if(!state.config.url) $('setupCard').classList.remove('hidden');
}
function saveLocal(){localStorage.setItem(LS.items,JSON.stringify(state.items));localStorage.setItem(LS.outfits,JSON.stringify(state.outfits));localStorage.setItem(LS.wishlist,JSON.stringify(state.wishlist));}
function initSupabase(){ if(state.config.url && state.config.key && window.supabase){ state.supabase = window.supabase.createClient(state.config.url,state.config.key); } }
function saveConfig(){state.config={url:$('supabaseUrl').value.trim(),key:$('supabaseKey').value.trim()};localStorage.setItem(LS.config,JSON.stringify(state.config));initSupabase();$('configStatus').textContent='Connection saved. Now test it.';}
async function testCloud(){try{if(!state.supabase) throw new Error('Save your connection first.'); const {error}=await state.supabase.from('wardrobe_items').select('id').limit(1); if(error) throw error; $('configStatus').textContent='Success: Supabase connected.';}catch(e){$('configStatus').textContent='Connection failed: '+e.message;}}
async function imageToDataUrl(file){return new Promise((resolve,reject)=>{if(!file)return resolve(''); const img=new Image(); const reader=new FileReader(); reader.onerror=()=>reject(new Error('Could not read photo. Try a screenshot or smaller photo.')); reader.onload=e=>{img.onload=()=>{const c=document.createElement('canvas'); const max=900; let w=img.width,h=img.height; if(w>h&&w>max){h=Math.round(h*max/w);w=max}else if(h>max){w=Math.round(w*max/h);h=max} c.width=w;c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); resolve(c.toDataURL('image/jpeg',0.68));}; img.onerror=()=>reject(new Error('Photo format not supported. Try screenshot/crop.')); img.src=e.target.result;}; reader.readAsDataURL(file);});}
async function uploadPhoto(dataUrl,id){ if(!dataUrl || !state.supabase) return dataUrl; const blob=await (await fetch(dataUrl)).blob(); const path=`${id}.jpg`; const {error}=await state.supabase.storage.from('wardrobe-photos').upload(path,blob,{contentType:'image/jpeg',upsert:true}); if(error) return dataUrl; const {data}=state.supabase.storage.from('wardrobe-photos').getPublicUrl(path); return data.publicUrl; }
async function saveItem(){
  try{
    const name=$('name').value.trim(); if(!name){$('saveStatus').textContent='Add a name first.';return;}
    $('saveStatus').textContent='Saving...'; const id=$('editId').value || crypto.randomUUID();
    const existing=state.items.find(i=>i.id===id)||{}; const file=$('photo').files[0]; let image_url=existing.image_url||'';
    if(file){ const dataUrl=await imageToDataUrl(file); image_url=await uploadPhoto(dataUrl,id); }
    const item={id,name,brand:$('brand').value.trim(),category:$('category').value,colour:$('colour').value.trim(),occasion:$('occasion').value.trim(),season:$('season').value.trim(),notes:$('notes').value.trim(),image_url,favourite:existing.favourite||false,created_at:existing.created_at||new Date().toISOString()};
    const idx=state.items.findIndex(i=>i.id===id); if(idx>=0) state.items[idx]=item; else state.items.unshift(item); saveLocal();
    if(state.supabase){ const {error}=await state.supabase.from('wardrobe_items').upsert(item); if(error) $('saveStatus').textContent='Saved locally, cloud failed: '+error.message; else $('saveStatus').textContent='Saved locally and to cloud.'; } else $('saveStatus').textContent='Saved locally. Connect Supabase for cloud sync.';
    clearForm(); renderAll(); showTab('wardrobe');
  }catch(e){$('saveStatus').textContent=e.message;}
}
function clearForm(){['editId','name','brand','colour','occasion','season','notes'].forEach(id=>$(id).value='');$('photo').value='';$('formTitle').textContent='Add item';}
function renderAll(){renderItems();renderStats();renderWishlist();renderOutfits();renderGaps();}
function renderStats(){$('itemCount').textContent=state.items.length;$('favCount').textContent=state.items.filter(i=>i.favourite).length;$('wishCount').textContent=state.wishlist.length;}
function renderItems(){const q=($('search')?.value||'').toLowerCase(), cat=$('filterCategory')?.value||''; const grid=$('itemsGrid'); grid.innerHTML=''; state.items.filter(i=>(!cat||i.category===cat)&&JSON.stringify(i).toLowerCase().includes(q)).forEach(item=>{const tpl=$('itemTpl').content.cloneNode(true); const card=tpl.querySelector('.itemCard'); const photo=tpl.querySelector('.photo'); if(item.image_url) photo.style.backgroundImage=`url('${item.image_url}')`; else photo.textContent='No photo'; tpl.querySelector('h3').textContent=item.name; tpl.querySelector('.meta').textContent=[item.brand,item.category,item.colour].filter(Boolean).join(' • '); tpl.querySelector('.notes').textContent=item.notes||item.occasion||''; tpl.querySelector('.fav').textContent=item.favourite?'★':'☆'; tpl.querySelector('.fav').onclick=()=>toggleFav(item.id); tpl.querySelector('.edit').onclick=()=>editItem(item.id); tpl.querySelector('.delete').onclick=()=>deleteItem(item.id); grid.appendChild(tpl);});}
function toggleFav(id){const i=state.items.find(x=>x.id===id); if(i){i.favourite=!i.favourite;saveLocal();renderAll(); if(state.supabase) state.supabase.from('wardrobe_items').upsert(i);}}
function editItem(id){const i=state.items.find(x=>x.id===id); if(!i)return; showTab('add'); $('formTitle').textContent='Edit item'; ['id','name','brand','category','colour','occasion','season','notes'].forEach(k=>{const el=$(k==='id'?'editId':k); if(el) el.value=i[k]||'';});}
async function deleteItem(id){if(!confirm('Delete this item?'))return; state.items=state.items.filter(i=>i.id!==id);saveLocal();renderAll(); if(state.supabase) await state.supabase.from('wardrobe_items').delete().eq('id',id);}
function pick(cat){const arr=state.items.filter(i=>i.category===cat);return arr[Math.floor(Math.random()*arr.length)]}
function generateOutfit(){const parts=[['Jacket',pick('Blazer / Jacket')],['Top',pick('Top')],['Jeans/Trousers',pick('Jeans / Trousers')],['Shoes',pick('Shoes / Boots')],['Watch',pick('Watch')],['Accessory',pick('Belt / Accessory')]]; const filled=parts.filter(p=>p[1]).length; const confidence=Math.min(98,55+filled*7+(pick('Blazer / Jacket')&&pick('Shoes / Boots')?8:0)); let html=`<p class="confidence">Confidence ${confidence}%</p><p class="muted">Occasion: ${$('outfitOccasion').value}</p>`; parts.forEach(([label,item])=>html+=`<div class="outfitItem"><strong>${label}:</strong> ${item?item.name+' — '+(item.colour||''):'Add one to wardrobe'}</div>`); html+=`<button onclick="saveCurrentOutfit()">Save favourite outfit</button>`; $('outfitResult').innerHTML=html; window.currentOutfit=parts.filter(p=>p[1]).map(p=>p[1].id); $('todayIdea').textContent=parts.filter(p=>p[1]).map(p=>p[1].name).join(' + ');}
function saveCurrentOutfit(){if(!window.currentOutfit?.length)return; state.outfits.unshift({id:crypto.randomUUID(),name:'Favourite outfit',item_ids:window.currentOutfit,notes:$('outfitOccasion').value,favourite:true,created_at:new Date().toISOString()});saveLocal();renderOutfits();}
function renderOutfits(){const box=$('savedOutfits'); box.innerHTML=''; state.outfits.forEach(o=>{const names=o.item_ids.map(id=>state.items.find(i=>i.id===id)?.name).filter(Boolean).join(' + '); const div=document.createElement('div'); div.className='outfitItem'; div.innerHTML=`<strong>${o.name}</strong><p>${names}</p><p class="muted">${o.notes||''}</p>`; box.appendChild(div);});}
function addWish(){const name=$('wishName').value.trim(); if(!name)return; state.wishlist.unshift({id:crypto.randomUUID(),name,category:'Wishlist',notes:'',created_at:new Date().toISOString()});$('wishName').value='';saveLocal();renderWishlist();}
function renderWishlist(){const box=$('wishlistList'); box.innerHTML=''; state.wishlist.forEach(w=>{const div=document.createElement('div'); div.className='outfitItem'; div.innerHTML=`<strong>${w.name}</strong><button class="danger" style="margin-top:8px" onclick="removeWish('${w.id}')">Remove</button>`; box.appendChild(div);});}
function removeWish(id){state.wishlist=state.wishlist.filter(w=>w.id!==id);saveLocal();renderWishlist();renderStats();}
function seedStarter(){ if(!confirm('Load starter wardrobe and wishlist?'))return; const existing=new Set(state.items.map(i=>i.name)); starterItems.forEach(i=>{if(!existing.has(i.name))state.items.push({...i,id:crypto.randomUUID(),image_url:'',favourite:false,created_at:new Date().toISOString()});}); if(!state.wishlist.length) state.wishlist=starterWishlist; saveLocal();renderAll();}
function renderGaps(){const cats=['Blazer / Jacket','Top','Jeans / Trousers','Shoes / Boots','Watch','Belt / Accessory']; const gaps=cats.filter(c=>state.items.filter(i=>i.category===c).length<1); $('gaps').innerHTML=gaps.length?gaps.map(g=>`<span class="pill">Add ${g}</span>`).join(''):'<p class="muted">Good coverage. Next useful gaps: white trainers, light Oxford shirt, forest green Harrington.</p>';}
async function syncCloud(){try{if(!state.supabase){alert('Connect Supabase in Settings first.');return;} const {data,error}=await state.supabase.from('wardrobe_items').select('*').order('created_at',{ascending:false}); if(error)throw error; const byId=new Map(state.items.map(i=>[i.id,i])); (data||[]).forEach(i=>byId.set(i.id,i)); state.items=[...byId.values()]; saveLocal(); renderAll(); alert('Synced.');}catch(e){alert('Sync failed: '+e.message);}}
function exportBackup(){const blob=new Blob([JSON.stringify({items:state.items,outfits:state.outfits,wishlist:state.wishlist},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='stylemate-backup.json'; a.click();}
function importBackup(e){const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{const data=JSON.parse(r.result); state.items=data.items||state.items; state.outfits=data.outfits||state.outfits; state.wishlist=data.wishlist||state.wishlist; saveLocal();renderAll();}; r.readAsText(f);}
