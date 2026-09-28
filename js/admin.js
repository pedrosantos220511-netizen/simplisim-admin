const BUCKET = "produtos";
let products = [];
let editingId = null;
let selectedFile = null;
let currentImageUrl = null;

const $ = (id) => document.getElementById(id);
const money = (n) => Number(n || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});

function toast(message, type="ok") {
  const el = $("toast"); el.textContent = message; el.className = "toast show " + type;
  setTimeout(() => el.classList.remove("show"), 2800);
}
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  $(page + "Page").classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $("pageTitle").textContent = page === "produtos" ? "Produtos" : page === "categorias" ? "Categorias" : "Dashboard";
}
function getCategories() {
  return [...new Set(products.map(p => (p.categoria || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
async function requireAdmin(session) {
  const { data, error } = await supabaseClient.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (error || !data) throw new Error("Este usuário não possui permissão de administrador.");
}
async function loadProducts() {
  const { data, error } = await supabaseClient.from("produtos").select("*").order("created_at", {ascending:false});
  if (error) throw error;
  products = data || [];
  renderAll();
}
function renderAll() {
  const active = products.filter(p=>p.ativo).length;
  $("statTotal").textContent = products.length;
  $("statActive").textContent = active;
  $("statInactive").textContent = products.length-active;
  $("statCategories").textContent = getCategories().length;
  const cats = getCategories();
  $("categoryFilter").innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
  $("categoryList").innerHTML = cats.map(c=>`<option value="${escapeHtml(c)}">`).join("");
  renderProducts();
  renderRecent();
  renderCategories();
}
function renderRecent() {
  const recent = products.slice(0,4);
  $("recentProducts").innerHTML = recent.length ? recent.map(productCard).join("") : '<div class="empty">Nenhum produto cadastrado.</div>';
}
function productCard(p) {
  return `<div class="recent-card"><div class="thumb">${p.imagem_url ? `<img src="${escapeAttr(p.imagem_url)}">` : "S"}</div><div><strong>${escapeHtml(p.nome)}</strong><span>${money(p.preco)}</span></div></div>`;
}
function renderProducts() {
  const q = $("searchInput").value.toLowerCase().trim();
  const cat = $("categoryFilter").value;
  const status = $("statusFilter").value;
  const filtered = products.filter(p => (!q || (p.nome||"").toLowerCase().includes(q) || (p.descricao||"").toLowerCase().includes(q)) && (!cat || p.categoria===cat) && (!status || String(p.ativo)===status));
  $("productsBody").innerHTML = filtered.map(p => `<tr>
    <td><div class="product-cell"><div class="table-thumb">${p.imagem_url ? `<img src="${escapeAttr(p.imagem_url)}">` : "S"}</div><div><strong>${escapeHtml(p.nome)}</strong><small>${escapeHtml(p.descricao||"Sem descrição")}</small></div></div></td>
    <td>${escapeHtml(p.categoria || "—")}</td><td><strong>${money(p.preco)}</strong></td>
    <td><span class="status ${p.ativo ? "active":"inactive"}">${p.ativo ? "Ativo":"Inativo"}</span></td>
    <td><div class="actions"><button class="action" onclick="editProduct('${p.id}')">Editar</button><button class="action" onclick="toggleProduct('${p.id}')">${p.ativo?"Desativar":"Ativar"}</button><button class="action danger" onclick="deleteProduct('${p.id}')">Excluir</button></div></td>
  </tr>`).join("");
  $("emptyProducts").classList.toggle("hidden", filtered.length !== 0);
}
function renderCategories() {
  const counts = {};
  products.forEach(p=>{
    const c=(p.categoria||"").trim();
    if(c) counts[c]=(counts[c]||0)+1;
  });

  const categories = Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR"));

  $("categoriesGrid").innerHTML = categories.length
    ? categories.map(([c,n])=>`
      <div class="category-card">
        <div class="cat-icon">◈</div>
        <div class="category-main">
          <strong>${escapeHtml(c)}</strong>
          <span>${n} produto${n===1?"":"s"}</span>
        </div>
        <div class="category-actions">
          <button class="action" onclick="renameCategory(${JSON.stringify(c)})">Renomear</button>
          <button class="action danger" onclick="deleteCategory(${JSON.stringify(c)})">Excluir</button>
        </div>
      </div>`).join("")
    : '<div class="empty">Nenhuma categoria cadastrada. Crie uma categoria ao cadastrar um produto.</div>';
}

window.renameCategory = async (oldName) => {
  const newName = prompt(`Novo nome para a categoria "${oldName}":`, oldName);
  if(newName === null) return;
  const value = newName.trim();
  if(!value) return toast("O nome da categoria não pode ficar vazio.","error");
  if(value === oldName) return;
  if(getCategories().some(c=>c.toLowerCase()===value.toLowerCase() && c!==oldName)){
    return toast("Essa categoria já existe.","error");
  }

  const { error } = await supabaseClient
    .from("produtos")
    .update({ categoria: value })
    .eq("categoria", oldName);

  if(error) return toast(error.message,"error");
  await loadProducts();
  toast("Categoria renomeada com sucesso.");
};

window.deleteCategory = async (name) => {
  const count = products.filter(p=>(p.categoria||"").trim() === name).length;
  const ok = confirm(`Excluir a categoria "${name}"?\n\nOs ${count} produto${count===1?"":"s"} dessa categoria continuarão no catálogo, mas ficarão sem categoria.`);
  if(!ok) return;

  const { error } = await supabaseClient
    .from("produtos")
    .update({ categoria: null })
    .eq("categoria", name);

  if(error) return toast(error.message,"error");
  await loadProducts();
  toast("Categoria excluída.");
};
function openModal(p=null) {
  editingId = p?.id || null; selectedFile=null; currentImageUrl=p?.imagem_url||null;
  $("modalTitle").textContent = p ? "Editar produto" : "Novo produto";
  $("productId").value = p?.id || ""; $("productName").value=p?.nome||""; $("productPrice").value=p?.preco??"";
  $("productCategory").value=p?.categoria||""; $("productDescription").value=p?.descricao||""; $("productActive").checked=p ? !!p.ativo : true;
  $("productImage").value=""; $("formError").textContent="";
  if (currentImageUrl) { $("previewImg").src=currentImageUrl; $("imagePreview").classList.remove("hidden"); $("dropZone").classList.add("hidden"); } else { $("imagePreview").classList.add("hidden"); $("dropZone").classList.remove("hidden"); }
  $("modal").classList.remove("hidden");
}
function closeModal(){ $("modal").classList.add("hidden"); }
function chooseFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) { $("formError").textContent="Escolha uma imagem válida."; return; }
  selectedFile=file; $("previewImg").src=URL.createObjectURL(file); $("imagePreview").classList.remove("hidden"); $("dropZone").classList.add("hidden");
}
async function uploadImage(file) {
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
  const path=`${crypto.randomUUID()}.${ext}`;
  const {error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});
  if(error) throw error;
  return supabaseClient.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function removeImageUrl(url) {
  if(!url || !url.includes("/"+BUCKET+"/")) return;
  const path=decodeURIComponent(url.split("/"+BUCKET+"/")[1].split("?")[0]);
  if(path) await supabaseClient.storage.from(BUCKET).remove([path]);
}
async function saveProduct(e){
  e.preventDefault();
  $("formError").textContent="";
  $("saveBtn").disabled=true;
  $("saveBtn").textContent="Salvando...";

  let uploadedNewImage = null;

  try {
    const nome=$("productName").value.trim();
    const preco=Number($("productPrice").value);
    const categoria=$("productCategory").value.trim()||null;
    const descricao=$("productDescription").value.trim()||null;
    const ativo=$("productActive").checked;

    if(!nome) throw new Error("Preencha o nome do produto.");
    if(Number.isNaN(preco) || preco < 0) throw new Error("Informe um preço válido.");

    let imageUrl=currentImageUrl;

    if(selectedFile){
      imageUrl=await uploadImage(selectedFile);
      uploadedNewImage=imageUrl;
    }

    const row={nome,descricao,preco,categoria,ativo,imagem_url:imageUrl||null};

    let result;
    if(editingId){
      result=await supabaseClient.from("produtos").update(row).eq("id",editingId);
    } else {
      result=await supabaseClient.from("produtos").insert(row);
    }

    if(result.error) throw result.error;

    if(editingId && selectedFile && currentImageUrl){
      await removeImageUrl(currentImageUrl);
    }

    closeModal();
    await loadProducts();
    toast(editingId ? "Produto atualizado!" : "Produto cadastrado!");
  } catch(err) {
    if(uploadedNewImage && uploadedNewImage !== currentImageUrl){
      await removeImageUrl(uploadedNewImage).catch(()=>{});
    }
    $("formError").textContent=err.message || "Não foi possível salvar.";
  } finally {
    $("saveBtn").disabled=false;
    $("saveBtn").textContent="Salvar produto";
  }
}
window.editProduct=(id)=>openModal(products.find(p=>String(p.id)===String(id)));
window.toggleProduct=async(id)=>{
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  const {error}=await supabaseClient.from("produtos").update({ativo:!p.ativo}).eq("id",id);
  if(error)return toast(error.message,"error"); await loadProducts(); toast(p.ativo?"Produto desativado.":"Produto ativado.");
};
window.deleteProduct=async(id)=>{
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  if(!confirm(`Excluir "${p.nome}"?`))return;
  const {error}=await supabaseClient.from("produtos").delete().eq("id",id);
  if(error)return toast(error.message,"error");
  if(p.imagem_url) await removeImageUrl(p.imagem_url);
  await loadProducts(); toast("Produto excluído.");
};
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(v){return escapeHtml(v);}
async function boot(){
  try {
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(session) await enterApp(session);
  } catch(e){console.error(e)}
}
async function enterApp(session){
  await requireAdmin(session);
  $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden"); $("userEmail").textContent=session.user.email||"Admin";
  await loadProducts();
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); $("loginError").textContent="";
  const {data,error}=await supabaseClient.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){$("loginError").textContent=error.message;return;}
  try{await enterApp(data.session);}catch(err){await supabaseClient.auth.signOut();$("loginError").textContent=err.message;}
});
supabaseClient.auth.onAuthStateChange((event,session)=>{ if(event==="SIGNED_OUT"){ $("app").classList.add("hidden"); $("loginScreen").classList.remove("hidden"); }});
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
$("newProductBtn").onclick=$("newProductTop").onclick=()=>openModal();
$("closeModal").onclick=$("cancelBtn").onclick=closeModal;
$("productForm").addEventListener("submit",saveProduct);
$("chooseImage").onclick=()=>$("productImage").click();
$("productImage").addEventListener("change",e=>chooseFile(e.target.files[0]));
$("removeImage").onclick=()=>{selectedFile=null;currentImageUrl=null;$("imagePreview").classList.add("hidden");$("dropZone").classList.remove("hidden");$("productImage").value=""};
["searchInput","categoryFilter","statusFilter"].forEach(id=>$(id).addEventListener("input",renderProducts));
$("dropZone").addEventListener("dragover",e=>{e.preventDefault();$("dropZone").classList.add("drag")});
$("dropZone").addEventListener("dragleave",()=>$("dropZone").classList.remove("drag"));
$("dropZone").addEventListener("drop",e=>{e.preventDefault();$("dropZone").classList.remove("drag");chooseFile(e.dataTransfer.files[0])});
$("logoutBtn").onclick=async()=>{await supabaseClient.auth.signOut()};
$("newCategoryBtn")?.addEventListener("click",()=>{
  const name=prompt("Nome da nova categoria:");
  if(name===null) return;
  const value=name.trim();
  if(!value) return toast("Digite um nome para a categoria.","error");
  if(getCategories().some(c=>c.toLowerCase()===value.toLowerCase())) return toast("Essa categoria já existe.","error");
  openModal();
  $("productCategory").value=value;
  toast("Categoria selecionada. Agora cadastre o primeiro produto.");
});
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});
boot();