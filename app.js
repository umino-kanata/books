const STORAGE_KEY='my_collection_items_v1';
const CATEGORY_KEY='my_collection_categories_v1';
const LOCATION_KEY='my_collection_locations_v1';
const FORMAT_VERSION=2;

const defaultCategoryNames=['小説','歴史','漫画','写真集','雑誌','元気を出したい','ブログに使えそう'];
const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function migrateCategories(raw){
  if(!Array.isArray(raw)) return defaultCategoryNames.map((name,i)=>({id:uid(),name,hidden:false,order:i}));
  return raw.map((c,i)=>typeof c==='string'?{id:uid(),name:c,hidden:false,order:i}:{id:c.id||uid(),name:c.name||'',hidden:!!c.hidden,order:Number.isFinite(c.order)?c.order:i}).filter(c=>c.name);
}
function migrateItem(i){
  const contributors=Array.isArray(i.contributors)?i.contributors:((i.creator||'').split(/[、,]/).map(x=>x.trim()).filter(Boolean).map(name=>({role:'著者',name})));
  const categoryNames=Array.isArray(i.categories)?i.categories:[];
  return {...i,bookType:i.bookType||'書籍',contributors,categoryNames,loaned:i.loaned??(i.loanStatus==='貸出中'),loanMemo:i.loanMemo||i.loanTo||'',publishedDate:i.publishedDate||''};
}
let items=(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')).map(migrateItem);
let categories=migrateCategories(JSON.parse(localStorage.getItem(CATEGORY_KEY)||'null'));
let locations=JSON.parse(localStorage.getItem(LOCATION_KEY)||'[]'); if(!Array.isArray(locations)) locations=[];
let unreadOnly=false, favoriteOnly=false, scanner=null;

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));localStorage.setItem(CATEGORY_KEY,JSON.stringify(categories));localStorage.setItem(LOCATION_KEY,JSON.stringify(locations));}
function orderedCategories(includeHidden=false){return categories.filter(c=>includeHidden||!c.hidden).sort((a,b)=>a.order-b.order);}
function categoryName(idOrName){const c=categories.find(x=>x.id===idOrName||x.name===idOrName);return c?c.name:idOrName;}

function renderCategories(selected=[]){
  const cats=orderedCategories(false);
  $('categoryFilter').innerHTML='<option value="">すべてのカテゴリー</option>'+cats.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('categoryChecks').innerHTML=cats.map(c=>`<label><input type="checkbox" name="category" value="${esc(c.id)}">${esc(c.name)}</label>`).join('');
  document.querySelectorAll('input[name="category"]').forEach(x=>x.checked=selected.includes(x.value)||selected.includes(categoryName(x.value)));
}
function renderLocations(selected=''){
  $('location').innerHTML='<option value="">未設定</option>'+locations.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join('');
  $('location').value=selected||'';
}
function contributorsText(i){return (i.contributors||[]).map(c=>c.name).filter(Boolean).join('、') || i.creator || ''}

function render(){
  const q=$('searchInput').value.trim().toLowerCase();
  const catId=$('categoryFilter').value;
  const catNameValue=catId?categoryName(catId):'';
  const filtered=items.filter(i=>(i.media||'book')==='book')
    .filter(i=>!q||(i.title||'').toLowerCase().includes(q)||contributorsText(i).toLowerCase().includes(q))
    .filter(i=>!catId||(i.categoryIds||[]).includes(catId)||(i.categoryNames||i.categories||[]).includes(catNameValue))
    .filter(i=>!unreadOnly||i.unread).filter(i=>!favoriteOnly||i.favorite);
  $('resultCount').textContent=`${filtered.length}件`;
  if(!filtered.length){$('itemList').innerHTML='<div class="empty">まだ登録がありません。</div>';return;}
  $('itemList').innerHTML=filtered.map(i=>{
    const badges=[]; if(i.unread)badges.push('未読'); if(i.favorite)badges.push('♥'); if(i.owned===false)badges.push(i.notOwnedReason||'未所有'); else if(i.loaned)badges.push('貸出中');
    const firstCat=(i.categoryIds||[])[0]; const oldCat=(i.categoryNames||i.categories||[])[0]; if(firstCat||oldCat)badges.push(categoryName(firstCat||oldCat));
    return `<button class="item" data-id="${esc(i.id)}"><div class="item-main"><div class="item-title">${esc(i.title)}</div><div class="item-sub">${esc(contributorsText(i)||'著者未入力')}</div><div class="badges">${badges.map(b=>`<span class="badge">${esc(b)}</span>`).join('')}</div></div><div class="item-arrow">›</div></button>`;
  }).join('');
  document.querySelectorAll('.item').forEach(el=>el.addEventListener('click',()=>openForm(el.dataset.id)));
}

function showView(name){$('homeView').classList.toggle('active',name==='home');$('formView').classList.toggle('active',name==='form');$('addBtn').classList.toggle('hidden',name!=='home');}
function contributorRow(data={role:'著者',name:''}){
  const row=document.createElement('div'); row.className='contributor-row';
  row.innerHTML=`<select class="contributor-role"><option>著者</option><option>訳者</option><option>写真</option><option>編者</option><option>監修</option><option>その他</option></select><input class="contributor-name" placeholder="名前" /><button type="button" class="remove-row" aria-label="行を削除">×</button>`;
  row.querySelector('.contributor-role').value=data.role||'著者'; row.querySelector('.contributor-name').value=data.name||'';
  row.querySelector('.remove-row').addEventListener('click',()=>{if($('contributors').children.length>1)row.remove(); else row.querySelector('.contributor-name').value='';});
  $('contributors').appendChild(row);
}
function setContributors(list=[]){$('contributors').innerHTML=''; (list.length?list:[{role:'著者',name:''}]).forEach(contributorRow);}
function getContributors(){return [...document.querySelectorAll('.contributor-row')].map(r=>({role:r.querySelector('.contributor-role').value,name:r.querySelector('.contributor-name').value.trim()})).filter(x=>x.name);}

function toggleOwned(){const owned=$('owned').checked;$('ownedFields').classList.toggle('hidden',!owned);$('notOwnedFields').classList.toggle('hidden',owned);$('loanToggleWrap').classList.toggle('hidden',!owned);if(!owned){$('loaned').checked=false;toggleLoan();}}
function toggleLoan(){$('loanMemoWrap').classList.toggle('hidden',!$('loaned').checked);}
function resetForm(){
  $('itemForm').reset(); $('itemId').value=''; $('owned').checked=true; $('loaned').checked=false; $('unread').checked=false; $('favorite').checked=false; $('bookType').value='書籍';
  renderCategories([]); renderLocations(''); setContributors([]); document.querySelectorAll('input[name="format"]').forEach(x=>x.checked=false); toggleOwned();toggleLoan(); $('deleteBtn').classList.add('hidden');$('formTitle').textContent='作品を登録';$('isbnMessage').textContent='';
}
function openForm(id=''){
  resetForm();showView('form');if(!id)return; const i=items.find(x=>x.id===id);if(!i)return;
  $('formTitle').textContent='作品を編集';$('deleteBtn').classList.remove('hidden');$('itemId').value=i.id;$('bookType').value=i.bookType||'書籍';$('title').value=i.title||'';setContributors(i.contributors||[]);$('series').value=i.series||'';$('volume').value=i.volume||'';
  const selectedIds=i.categoryIds||[]; const selectedOld=i.categoryNames||i.categories||[]; renderCategories([...selectedIds,...selectedOld]);
  $('favorite').checked=!!i.favorite;$('unread').checked=!!i.unread;$('owned').checked=i.owned!==false;$('loaned').checked=!!i.loaned;$('loanMemo').value=i.loanMemo||'';$('notOwnedReason').value=i.notOwnedReason||'未購入';renderLocations(i.location||'');
  document.querySelectorAll('input[name="format"]').forEach(x=>x.checked=(i.formats||[]).includes(x.value)); $('isbn').value=i.isbn||'';$('publisher').value=i.publisher||'';$('labelName').value=i.labelName||'';$('publishedDate').value=i.publishedDate||'';$('review').value=i.review||'';$('memo').value=i.memo||'';toggleOwned();toggleLoan();
}
function collectForm(){return {id:$('itemId').value||uid(),media:'book',bookType:$('bookType').value,title:$('title').value.trim(),contributors:getContributors(),series:$('series').value.trim(),volume:$('volume').value.trim(),categoryIds:[...document.querySelectorAll('input[name="category"]:checked')].map(x=>x.value),favorite:$('favorite').checked,unread:$('unread').checked,owned:$('owned').checked,formats:[...document.querySelectorAll('input[name="format"]:checked')].map(x=>x.value),location:$('location').value,loaned:$('loaned').checked,loanMemo:$('loanMemo').value.trim(),notOwnedReason:$('notOwnedReason').value,isbn:$('isbn').value.replace(/[^0-9Xx]/g,''),publisher:$('publisher').value.trim(),labelName:$('labelName').value.trim(),publishedDate:$('publishedDate').value.trim(),review:$('review').value.trim(),memo:$('memo').value.trim(),updatedAt:new Date().toISOString()};}

function addCategory(name){name=name.trim();if(!name)return null;let c=categories.find(x=>x.name===name);if(!c){c={id:uid(),name,hidden:false,order:categories.length};categories.push(c);save();}return c;}
function renderCategoryManager(){
  $('categoryManager').innerHTML=orderedCategories(true).map((c,idx,arr)=>`<div class="manager-row" data-id="${esc(c.id)}"><input class="cat-name" value="${esc(c.name)}" /><button class="move-up" ${idx===0?'disabled':''}>↑</button><button class="move-down" ${idx===arr.length-1?'disabled':''}>↓</button><button class="toggle-hide">${c.hidden?'表示':'非表示'}</button><button class="delete-cat danger-mini">削除</button></div>`).join('');
  $('categoryManager').querySelectorAll('.manager-row').forEach(row=>{
    const id=row.dataset.id,c=categories.find(x=>x.id===id);
    row.querySelector('.cat-name').addEventListener('change',e=>{const n=e.target.value.trim();if(n)c.name=n;save();renderCategories();render();});
    row.querySelector('.move-up').addEventListener('click',()=>moveCategory(id,-1)); row.querySelector('.move-down').addEventListener('click',()=>moveCategory(id,1));
    row.querySelector('.toggle-hide').addEventListener('click',()=>{c.hidden=!c.hidden;save();renderCategoryManager();renderCategories();render();});
    row.querySelector('.delete-cat').addEventListener('click',()=>{if(confirm(`「${c.name}」を削除しますか？\n作品とのカテゴリー設定も外れます。`)){categories=categories.filter(x=>x.id!==id);items=items.map(i=>({...i,categoryIds:(i.categoryIds||[]).filter(x=>x!==id)}));normalizeCategoryOrders();save();renderCategoryManager();renderCategories();render();}});
  });
}
function normalizeCategoryOrders(){orderedCategories(true).forEach((c,i)=>c.order=i);}
function moveCategory(id,delta){const arr=orderedCategories(true),idx=arr.findIndex(x=>x.id===id),ni=idx+delta;if(idx<0||ni<0||ni>=arr.length)return;[arr[idx].order,arr[ni].order]=[arr[ni].order,arr[idx].order];save();renderCategoryManager();renderCategories();render();}

function renderLocationManager(){
  $('locationManager').innerHTML=locations.map((l,i)=>`<div class="manager-row" data-index="${i}"><input class="loc-name" value="${esc(l)}"/><button class="delete-loc danger-mini">削除</button></div>`).join('')||'<div class="empty small-empty">まだ登録がありません。</div>';
  $('locationManager').querySelectorAll('.manager-row').forEach(row=>{const idx=Number(row.dataset.index);row.querySelector('.loc-name').addEventListener('change',e=>{const old=locations[idx],n=e.target.value.trim();if(!n)return;locations[idx]=n;items=items.map(i=>i.location===old?{...i,location:n}:i);save();renderLocations(n);});row.querySelector('.delete-loc').addEventListener('click',()=>{const old=locations[idx];if(confirm(`「${old}」を削除しますか？`)){locations.splice(idx,1);save();renderLocationManager();renderLocations();}});});
}

async function lookupISBN(){
  const isbn=$('isbn').value.replace(/[^0-9Xx]/g,''); $('isbn').value=isbn; if(!(isbn.length===10||isbn.length===13)){setIsbnMessage('ISBNを10桁または13桁で入力してください。',true);return;}
  setIsbnMessage('書籍情報を検索しています…');
  try{
    let info=null;
    try{const r=await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`);const d=await r.json();if(d.items?.length){const v=d.items[0].volumeInfo||{};info={title:v.title||'',authors:v.authors||[],publisher:v.publisher||'',publishedDate:v.publishedDate||''};}}catch{}
    if(!info){const r=await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`);const d=await r.json();const b=d[`ISBN:${isbn}`];if(b)info={title:b.title||'',authors:(b.authors||[]).map(a=>a.name),publisher:(b.publishers||[])[0]?.name||'',publishedDate:b.publish_date||''};}
    if(!info){setIsbnMessage('書籍情報が見つかりませんでした。手入力できます。',true);return;}
    if(info.title&&!$('title').value.trim())$('title').value=info.title; if(info.publisher&&!$('publisher').value.trim())$('publisher').value=info.publisher;if(info.publishedDate&&!$('publishedDate').value.trim())$('publishedDate').value=info.publishedDate;
    if(info.authors?.length){setContributors(info.authors.map(name=>({role:'著者',name})));}
    setIsbnMessage('書籍情報を取得しました。内容を確認して保存してください。');
  }catch(e){setIsbnMessage('書籍情報を取得できませんでした。手入力できます。',true);}
}
function setIsbnMessage(msg,error=false){$('isbnMessage').textContent=msg;$('isbnMessage').classList.toggle('error',error);}

function startScanner(){
  if(typeof Html5QrcodeScanner==='undefined'){alert('バーコード読み取り機能を読み込めませんでした。ISBNを手入力してください。');return;}
  $('scannerDialog').showModal(); $('reader').innerHTML='';
  scanner=new Html5QrcodeScanner('reader',{fps:10,qrbox:{width:280,height:120},rememberLastUsedCamera:true,supportedScanTypes:[Html5QrcodeScanType.SCAN_TYPE_CAMERA,Html5QrcodeScanType.SCAN_TYPE_FILE]},false);
  scanner.render(async decoded=>{const digits=String(decoded).replace(/\D/g,'');if((digits.length===13)&&(digits.startsWith('978')||digits.startsWith('979'))){$('isbn').value=digits;await stopScanner();lookupISBN();}else setIsbnMessage('価格コードではなく、978/979で始まるISBNバーコードを読み取ってください。',true);},()=>{});
}
async function stopScanner(){if(scanner){try{await scanner.clear();}catch{}scanner=null;}$('scannerDialog').close();}

$('itemForm').addEventListener('submit',e=>{e.preventDefault();const obj=collectForm();const idx=items.findIndex(x=>x.id===obj.id);if(idx>=0)items[idx]={...items[idx],...obj};else items.push({...obj,createdAt:new Date().toISOString()});save();showView('home');render();});
$('deleteBtn').addEventListener('click',()=>{const id=$('itemId').value;if(id&&confirm('この登録を削除しますか？')){items=items.filter(x=>x.id!==id);save();showView('home');render();}});
$('addBtn').addEventListener('click',()=>openForm()); $('backBtn').addEventListener('click',()=>{showView('home');render();}); $('addContributorBtn').addEventListener('click',()=>contributorRow({role:'著者',name:''}));
$('owned').addEventListener('change',toggleOwned);$('loaned').addEventListener('change',toggleLoan);$('searchInput').addEventListener('input',render);$('categoryFilter').addEventListener('change',render);
$('unreadFilter').addEventListener('click',()=>{unreadOnly=!unreadOnly;$('unreadFilter').classList.toggle('active',unreadOnly);render();});$('favoriteFilter').addEventListener('click',()=>{favoriteOnly=!favoriteOnly;$('favoriteFilter').classList.toggle('active',favoriteOnly);render();});

document.querySelectorAll('.media-card').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.shelf==='book')return;alert(`${btn.querySelector('strong').textContent}は開発中です。`);}));
$('addCategoryBtn').addEventListener('click',()=>{const c=addCategory($('newCategory').value);if(c){$('newCategory').value='';renderCategories([...(document.querySelectorAll('input[name="category"]:checked')||[])].map(x=>x.value));const cb=document.querySelector(`input[name="category"][value="${CSS.escape(c.id)}"]`);if(cb)cb.checked=true;}});
$('manageCategoryBtn').addEventListener('click',()=>{renderCategoryManager();$('categoryDialog').showModal();});$('closeCategoryDialog').addEventListener('click',()=>$('categoryDialog').close());
$('manageLocationBtn').addEventListener('click',()=>{renderLocationManager();$('locationDialog').showModal();});$('closeLocationDialog').addEventListener('click',()=>{$('locationDialog').close();renderLocations($('location').value);});$('addLocationBtn').addEventListener('click',()=>{const n=$('newLocation').value.trim();if(n&&!locations.includes(n)){locations.push(n);save();}$('newLocation').value='';renderLocationManager();renderLocations(n);});
$('isbnLookupBtn').addEventListener('click',lookupISBN);$('scanBtn').addEventListener('click',startScanner);$('closeScannerBtn').addEventListener('click',stopScanner);

$('backupBtn').addEventListener('click',()=>$('backupDialog').showModal());$('closeBackupBtn').addEventListener('click',()=>$('backupDialog').close());
$('exportBtn').addEventListener('click',()=>{const payload={formatVersion:FORMAT_VERSION,createdAt:new Date().toISOString(),items,categories,locations};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);const d=new Date(),z=n=>String(n).padStart(2,'0');a.download=`collection_backup_${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}.json`;a.click();URL.revokeObjectURL(a.href);});
$('importInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.items))throw new Error();if(confirm('現在のデータをバックアップ内容に置き換えます。よろしいですか？')){items=d.items.map(migrateItem);categories=migrateCategories(d.categories);locations=Array.isArray(d.locations)?d.locations:[];save();renderCategories();renderLocations();render();$('backupDialog').close();}}catch{alert('バックアップファイルを読み込めませんでした。');}e.target.value='';});

save();renderCategories();renderLocations();render();
