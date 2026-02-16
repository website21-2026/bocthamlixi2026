// ===== CONFIG =====
const CONFIG = {
  attemptsPerDevice: 1,
  storageKey: 'lixi_3x3_state_v3',
  infoKey: 'lixi_player_info_v2',
  prizes: [
    { text: 'Lì xì 10.000đ', weight: 18 },
    { text: 'Lì xì 20.000đ', weight: 28 },
    { text: 'Lì xì 50.000đ', weight: 8 },
    { text: 'Lì xì 100.000đ', weight: 8},
  ],
};

const qs = (s, r = document) => r.querySelector(s);
const grid = qs('#grid');
const statusEl = qs('#status');
const result = qs('#result');
const prizeText = qs('#prizeText');
const resetBtn = qs('#resetBtn');
const shareBtn = qs('#shareBtn');
const howTo = qs('#howTo');
const howToDlg = qs('#howToDlg');
const gate = qs('#gate');
const game = qs('#game');
const form = qs('#infoForm');

// Admin reset
const url = new URL(location.href);
const isAdmin = url.searchParams.get('admin') === '1';
if (isAdmin) resetBtn.classList.remove('hidden');
resetBtn.addEventListener('click', () => {
  if (confirm('Reset lượt bốc và xoá thông tin trên thiết bị này?')) {
    localStorage.removeItem(CONFIG.storageKey);
    localStorage.removeItem(CONFIG.infoKey);
    location.href = location.pathname; // clear search
  }
});

howTo.addEventListener('click', (e)=>{e.preventDefault();howToDlg.showModal();});

// Build 3×3 grid (each is just an envelope image)
for (let i=0; i<9; i++) {
  const card = document.createElement('button');
  card.className = 'card';
  card.setAttribute('aria-label', `Bao lì xì số ${i+1}`);
  card.innerHTML = `
    <div class="inner">
      <div class="face front">
      <img class="lixi-icon" src="assets/lixi-icon.png" alt=""/>
      
      </div>
      <div class="face back">
        <div class="prize">🎁</div>
        <div class="note"></div>
      </div>
    </div>`;
  card.addEventListener('click', () => onPick(card, i));
  grid.appendChild(card);
}

function weightedRandom(prizes) {
  const total = prizes.reduce((s,p)=>s+p.weight,0);
  let r = Math.random()*total;
  for (const p of prizes) { r -= p.weight; if (r <= 0) return p; }
  return prizes[prizes.length-1];
}

function lockAll() {
  grid.querySelectorAll('.card').forEach(c => c.disabled = true);
}

function saveState(data){ localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); }
function loadState(){ try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)); } catch {return null;} }
function saveInfo(data){ localStorage.setItem(CONFIG.infoKey, JSON.stringify(data)); }
function loadInfo(){ try { return JSON.parse(localStorage.getItem(CONFIG.infoKey)); } catch {return null;} }

function restoreIfPlayed(){
  
const s = loadState();
  if (!s || !s.played) return false;

  // Bỏ qua form, vào thẳng game
  gate.classList.add('hidden');
  game.classList.remove('hidden');

  lockAll();
  statusEl.textContent = `Anh chị đã bốc được: ${s.prize}. Vui lòng năm sau quay lại , Cảm ơn! Chúc anh chị năm mới thật nhiều sức khoẻ và hạnh phúc`;

  const card = grid.children[s.index];
  if (card){
    card.classList.add('open');
    const backFace = card.querySelector('.face.back');
    const src = s.prizeImg || prizeImageFor(s.prize); // fallback nếu bản cũ chưa lưu prizeImg
    if (backFace) {
      backFace.innerHTML = renderPrizeImg(src, s.prize);
    }
  }

  result.classList.remove('hidden');
  prizeText.textContent = s.prize;
  return true;

}

function showGame(){ gate.classList.add('hidden'); game.classList.remove('hidden'); }

// Form submit gate – chỉ 2 trường: name, phone
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = qs('#name').value.trim();
  const phone = qs('#phone').value.trim();
  const bank = qs('#bank').value.trim();
  let ok = true;
  qs('#errName').textContent = '';
  qs('#errPhone').textContent = '';
  qs('#errBank').textContent = '';
  if (!name){ qs('#errName').textContent = 'Không nhập họ và tên sao biết được là ai'; ok=false; }
  if (!/^\d{8,30}$/.test(phone)){
    qs('#errPhone').textContent = 'Phải nhập số tài khoản mới chuyển được tiến chứ'; ok=false;
  }
  if (!bank){ qs('#errBank').textContent = 'Không nhập tên ngân hàng sao biết ngân hàng nào mà gửi'; ok=false; }
  if (!ok) return;
  saveInfo({ name, phone, bank, ts: Date.now() });
  showGame();
});

function prizeImageFor(text)
{
  const map = 
  [
    { key: '10.000', img: 'assets/10k.png' },
    { key: '20.000', img: 'assets/20k.png' },
    { key: '50.000', img: 'assets/50k.png' },
    { key: '100.000',  img: 'assets/100k.png' },
  ];
  const found = map.find(m => text.includes(m.key));
  return found ? found.img : 'assets/money.png';   // fallback nếu không khớp
}

// Tạo HTML ảnh prize cho mặt sau
function renderPrizeImg(src, altText)
{
  return `<img src="${src}" class="prize-img" alt="${altText}">`;
}

function onPick(card, index)
{
  card.classList.add('open');
  lockAll();

  const prize = weightedRandom(CONFIG.prizes).text;
  const imgSrc = prizeImageFor(prize);

  // Chèn ảnh vào mặt sau
  const backFace = card.querySelector('.face.back');
  if (backFace)
  {
    backFace.innerHTML = renderPrizeImg(imgSrc, prize);
  }

  // (Tuỳ chọn) hiển thị text ở khu vực kết quả bên dưới
  statusEl.textContent = `Anh chị đã bốc được: ${prize}`;
  prizeText.textContent = prize;
  result.classList.remove('hidden');
  fireConfetti();

  // Lưu cả đường dẫn ảnh để khôi phục sau reload
  saveState({ played: true, prize, prizeImg: imgSrc, index, ts: Date.now() });

// === Gửi thông tin người chơi lên Google Form ===

// Form URL (đổi thành của bạn)
const FORM_URL = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSdtVOjIM_OaTCSDVAAKTEl8YxNBIy9xkIE3Qv_76FzmJBhlfw/formResponse";

// ID của 2 trường trong Google Form (đổi thành của bạn)
const NAME_ID  = "entry.1163485843";      // Họ & tên
const PHONE_ID = "entry.2137616281";        // Số tài khoản
const PRIZE_ID = "entry.594172824";      // Giải thưởng
const BANK_ID = "entry.268606437";        // Tên ngân hàng

// Lấy thông tin người chơi từ localStorage
const info = loadInfo();

// Tạo form data để gửi
const data = new FormData();
data.append(NAME_ID,  info?.name  || "");
data.append(PHONE_ID, info?.phone || "");
data.append(PRIZE_ID, prize);
data.append(BANK_ID, info?.bank || "");

// Gửi dữ liệu (mode: no-cors để khỏi bị lỗi CORS)
fetch(FORM_URL, {
  method: "POST",
  mode: "no-cors",
  body: data
});

}

// Share
qs('#shareBtn').addEventListener('click', async ()=>{
  const info = loadInfo();
  const shareData = { title: 'Bốc Thăm Lì Xì', text: prizeText.textContent + (info?`
Người chơi: ${info.name}`:''), url: location.href.split('?')[0] };
  try { await navigator.share(shareData); }
  catch(e){ navigator.clipboard.writeText(shareData.url); alert('Đã copy liên kết!'); }
});

// Confetti
const canvas = document.getElementById('confettiCanvas');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize); resize();
let confettiPieces = [];
function fireConfetti(durationMs = 2400){
  const colors = ['#ff4d4f','#ffcf4a','#34c759','#4cd964','#ff8c00'];
  const count = Math.min(180, Math.floor(innerWidth/5));
  confettiPieces = Array.from({length: count}, () => ({
    x: Math.random()*canvas.width,
    y: -20-Math.random()*canvas.height*0.2,
    w: 8+Math.random()*8,
    h: 4+Math.random()*6,
    color: colors[Math.floor(Math.random()*colors.length)],
    tilt: Math.random()*360,
    speed: 2+Math.random()*3,
    spin: (Math.random()*6-3),
  }));
  const start = performance.now();
  (function loop(t){
    const elapsed = t - start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    confettiPieces.forEach(p=>{
      p.y += p.speed; p.tilt += p.spin;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt * Math.PI/180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
      if (p.y > canvas.height + 20) { p.y = -10; p.x = Math.random()*canvas.width; }
    });
    if (elapsed < durationMs) requestAnimationFrame(loop); else ctx.clearRect(0,0,canvas.width,canvas.height);
  })(performance.now());
}

// INIT
if (!restoreIfPlayed()){
  if (loadInfo()) showGame();
}

