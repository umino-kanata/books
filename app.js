const STORAGE_KEY='my_collection_items_v1';
const CATEGORY_KEY='my_collection_categories_v1';
const FORMAT_VERSION=1;

const defaultCategories=['小説','歴史','漫画','写真集','雑誌','元気を出したい','ブログに使えそう'];
let items=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
let categories=JSON.parse(localStorage.getItem(CATEGORY_KEY)||'null')||defaultCategories;
let currentMedia='book';
let unreadOnly=false;
let favoriteOnly=false;

const $=id=>document.getElementById(id);
const mediaNames={book:'本・雑誌',cd:'CD',dvd:'DVD',bluray:'Blu-ray',vhs:'VHS',digital:'デジタル'};

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));localStorage.setItem(CATEGORY_KEY,JSON.stringify(categories));}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function renderCategories(){
  $('categoryFilter').innerHTML='<option value="">すべてのカテゴリー</option>'+categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  $('categoryChecks').innerHTML=categories.map(c=>`<label><input type="checkbox" name="category" value="${escapeHtml(c)}">${escapeHtml(c)}</label>`).join('');
}

function render(){
  const q=$('searchInput').value.trim().toLowerCase();
  const cat=$('categoryFilter').value;
  const filtered=items.filter(i=>i.media===currentMedia)
    .filter(i=>!q || (i.title||'').toLowerCase().includes(q) || (i.creator||'').toLowerCase().includes(q))
    .filter(i=>!cat || (i.categories||[]).includes(cat))
    .filter(i=>!unreadOnly || i.unread)
    .filter(i=>!favoriteOnly || i.favorite);
  $('resultCount').textContent=`${filtered.length}件`;
  if(!filtered.length){$('itemList').innerHTML='<div class="empty">まだ登録がありません。</div>';return;}
  $('itemList').innerHTML=filtered.map(i=>{
    const badges=[];
    if(i.unread) badges.push('未読');
    if(i.favorite) badges.push('♥');
    if(i.owned===false) badges.push(i.notOwnedReason||'未所有');
    else if(i.loanStatus==='貸出中') badges.push('貸出中');
    if((i.categories||[])[0]) badges.push(i.categories[0]);
    return `<button class="item" data-id="${i.id}" style="width:100%;text-align:left">
      <div class="item-main"><div class="item-title">${escapeHtml(i.title)}</div><div class="item-sub">${escapeHtml(i.creator||'著者未入力')}</div><div class="badges">${badges.map(b=>`<span class="badge">${escapeHtml(b)}</span>`).join('')}</div></div><div class="item-arrow">›</div>
    </button>`;
  }).join('');
  document.querySelectorAll('.item').forEach(el=>el.addEventListener('click',()=>openForm(el.dataset.id)));
}

function showView(name){
  $('homeView').classList.toggle('active',name==='home');
  $('formView').classList.toggle('active',name==='form');
  $('addBtn').classList.toggle('hidden',name!=='home');
}

function resetForm(){
  $('itemForm').reset();
  $('itemId').value='';
  $('mediaType').value=currentMedia;
  $('owned').checked=true;
  $('unread').checked=false;
  document.querySelectorAll('input[name="category"],input[name="format"]').forEach(x=>x.checked=false);
  toggleOwned(); toggleLoan();
  $('deleteBtn').classList.add('hidden');
  $('formTitle').textContent='作品を登録';
}

function openForm(id=''){
  renderCategories(); resetForm(); showView('form');
  if(!id) return;
  const i=items.find(x=>x.id===id); if(!i) return;
  $('formTitle').textContent='作品を編集'; $('deleteBtn').classList.remove('hidden');
  const fields=['title','creator','series','volume','location','loanStatus','loanTo','notOwnedReason','isbn','publisher','labelName','service','review','memo'];
  $('itemId').value=i.id; $('mediaType').value=i.media||'book';
  fields.forEach(f=>$(f).value=i[f]||'');
  $('favorite').checked=!!i.favorite; $('unread').checked=!!i.unread; $('owned').checked=i.owned!==false;
  document.querySelectorAll('input[name="category"]').forEach(x=>x.checked=(i.categories||[]).includes(x.value));
  document.querySelectorAll('input[name="format"]').forEach(x=>x.checked=(i.formats||[]).includes(x.value));
  toggleOwned(); toggleLoan();
}

function toggleOwned(){
  const owned=$('owned').checked;
  $('ownedFields').classList.toggle('hidden',!owned);
  $('notOwnedFields').classList.toggle('hidden',owned);
}
function toggleLoan(){$('loanToWrap').classList.toggle('hidden',$('loanStatus').value!=='貸出中');}

function collectForm(){
  return {
    id:$('itemId').value||uid(), media:$('mediaType').value, title:$('title').value.trim(), creator:$('creator').value.trim(), series:$('series').value.trim(), volume:$('volume').value.trim(),
    categories:[...document.querySelectorAll('input[name="category"]:checked')].map(x=>x.value), favorite:$('favorite').checked, unread:$('unread').checked,
    owned:$('owned').checked, formats:[...document.querySelectorAll('input[name="format"]:checked')].map(x=>x.value), location:$('location').value.trim(), loanStatus:$('loanStatus').value, loanTo:$('loanTo').value.trim(),
    notOwnedReason:$('notOwnedReason').value, isbn:$('isbn').value.trim(), publisher:$('publisher').value.trim(), labelName:$('labelName').value.trim(), service:$('service').value.trim(), review:$('review').value.trim(), memo:$('memo').value.trim(),
    updatedAt:new Date().toISOString()
  };
}

$('itemForm').addEventListener('submit',e=>{e.preventDefault(); const obj=collectForm(); const idx=items.findIndex(x=>x.id===obj.id); if(idx>=0) items[idx]={...items[idx],...obj}; else items.push({...obj,createdAt:new Date().toISOString()}); save(); currentMedia=obj.media; document.querySelectorAll('.media-card').forEach(x=>x.classList.toggle('active',x.dataset.media===currentMedia)); $('pageTitle').textContent=mediaNames[currentMedia]; showView('home'); render();});
$('deleteBtn').addEventListener('click',()=>{const id=$('itemId').value;if(id&&confirm('この登録を削除しますか？')){items=items.filter(x=>x.id!==id);save();showView('home');render();}});
$('addBtn').addEventListener('click',()=>openForm());
$('backBtn').addEventListener('click',()=>{showView('home');render();});
$('owned').addEventListener('change',toggleOwned); $('loanStatus').addEventListener('change',toggleLoan);
$('searchInput').addEventListener('input',render); $('categoryFilter').addEventListener('change',render);
$('unreadFilter').addEventListener('click',()=>{unreadOnly=!unreadOnly;$('unreadFilter').classList.toggle('active',unreadOnly);render();});
$('favoriteFilter').addEventListener('click',()=>{favoriteOnly=!favoriteOnly;$('favoriteFilter').classList.toggle('active',favoriteOnly);render();});
document.querySelectorAll('.media-card').forEach(btn=>btn.addEventListener('click',()=>{currentMedia=btn.dataset.media;document.querySelectorAll('.media-card').forEach(x=>x.classList.toggle('active',x===btn));$('pageTitle').textContent=mediaNames[currentMedia];render();}));
$('addCategoryBtn').addEventListener('click',()=>{const c=$('newCategory').value.trim();if(!c)return;if(!categories.includes(c)){categories.push(c);save();renderCategories();} $('newCategory').value='';});

$('backupBtn').addEventListener('click',()=>$('backupDialog').showModal());
$('exportBtn').addEventListener('click',()=>{
  const payload={formatVersion:FORMAT_VERSION,createdAt:new Date().toISOString(),items,categories};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); const d=new Date(); const z=n=>String(n).padStart(2,'0'); a.download=`collection_backup_${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}.json`; a.click(); URL.revokeObjectURL(a.href);
});
$('importInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.items))throw new Error();if(confirm('現在のデータをバックアップ内容に置き換えます。よろしいですか？')){items=data.items;categories=Array.isArray(data.categories)?data.categories:defaultCategories;save();renderCategories();render();$('backupDialog').close();}}catch{alert('バックアップファイルを読み込めませんでした。');}e.target.value='';});

renderCategories(); render();
