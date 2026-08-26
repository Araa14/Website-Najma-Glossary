// ===================== KONFIGURASI SUPABASE =====================
const SUPABASE_URL = 'https://ygwrhsptqkyjljdmskwd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__eotng_5tTqAdiH_m3_U_w_OUWUMbtS';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ===================== STATE =====================
let currentUser = null;
let userFavorites = new Set();

let halamanSekarang = 1;
let modeSortHuruf = "latin";
let hurufTerpilih = null;
let kataKunciPencarian = "";
let savedScrollY = 0;

let favHalamanSekarang = 1;
let favDataCache = [];
let favSearchKeyword = "";

let homeHalamanSekarang = 1;
const HOME_KARTU_PER_HALAMAN = 18;
let homeDataCache = [];
let homeKeyword = "";

const KARTU_PER_HALAMAN = 18;
const FAV_KARTU_PER_HALAMAN = 18;
const listAlfabet = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
const listHijaiyah = ["ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","و","ه","لا","ء","ي"];

// ===================== DOM REFS =====================
const container = document.getElementById("card-container");
const btnBack = document.getElementById("btn-back");
const btnNext = document.getElementById("btn-next");
const pageNumbersContainer = document.getElementById("page-numbers");
const entriCountText = document.getElementById("entriCount");
const alfabetFilterContainer = document.getElementById("alfabetFilter");
const toggleSortTypeBtn = document.getElementById("toggleSortType");
const searchInput = document.getElementById("searchInput");

const halamanHome = document.getElementById('home-page');
const halamanGlosarium = document.getElementById('glosarium-page');
const halamanFavorit = document.getElementById('favorit-page');
const halamanMasukan = document.getElementById('masukan-page');
const navLinkHome = document.getElementById('btn-nav-home');
const navLinkGlosarium = document.getElementById('btn-nav-glosarium');
const navLinkFavorit = document.getElementById('btn-nav-favorit');
const navLinkMasukan = document.getElementById('btn-nav-masukan');
const tombolMulai = document.getElementById('btn-mulai');
const navbarKedua = document.querySelector('.second-navbar');
const headerBesar = document.querySelector('.header');
const homeResultsContainer = document.getElementById('homeSearchResults');
const homeSearchField = document.getElementById('homeSearchField');
const homeSearchBtn = document.getElementById('homeSearchBtn');
const footerElement = document.querySelector('footer');

const loginModal = document.getElementById('loginModal');
const loginBtnHeader = document.getElementById('loginBtnHeader');
const loginBtnHome = document.getElementById('loginBtnHome');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginFormContainer = document.getElementById('loginFormContainer');
const registerFormContainer = document.getElementById('registerFormContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const registerUsername = document.getElementById('registerUsername');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const registerError = document.getElementById('registerError');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const emailLoginBtn = document.getElementById('emailLoginBtn');

// ===================== FUNGSI AUTH =====================
async function signUp(email, password, username) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { username } }
    });
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
}

// ===================== SESSION & FAVORIT =====================
async function loadSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserFavorites();
    } else {
        currentUser = null;
        userFavorites.clear();
    }
    updateLoginButtons();
    renderApp();
    renderFavoritPage();
    renderHomeResults();
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        await loadUserFavorites();
    } else {
        currentUser = null;
        userFavorites.clear();
    }
    updateLoginButtons();
    renderApp();
    renderFavoritPage();
    renderHomeResults();
});

async function loadUserFavorites() {
    if (!currentUser) {
        userFavorites.clear();
        return;
    }
    const { data, error } = await supabase
        .from('favorites')
        .select('term_id')
        .eq('user_id', currentUser.id);
    if (error) {
        console.error('Gagal load favorit:', error);
        userFavorites.clear();
        return;
    }
    userFavorites = new Set(data.map(f => f.term_id));
}

async function toggleFavorite(termId) {
    if (!currentUser) {
        alert('Silakan login untuk menambahkan favorit.');
        return;
    }
    const isFav = userFavorites.has(termId);
    try {
        if (isFav) {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .match({ user_id: currentUser.id, term_id: termId });
            if (error) throw error;
            userFavorites.delete(termId);
        } else {
            const { error } = await supabase
                .from('favorites')
                .insert({ user_id: currentUser.id, term_id: termId });
            if (error) throw error;
            userFavorites.add(termId);
        }
        // Update UI
        renderApp();
        renderFavoritPage();
        renderHomeResults();
        updateFavCounter();
    } catch (error) {
        alert('Gagal mengubah favorit: ' + error.message);
    }
}

function updateFavCounter() {
    const counterSpan = document.getElementById("favCounter");
    if (counterSpan) counterSpan.innerText = userFavorites.size;
}

// ===================== LOGIN / REGISTER UI =====================
function updateLoginButtons() {
    const btns = [loginBtnHeader, loginBtnHome];
    if (currentUser) {
        const username = currentUser.user_metadata?.username || currentUser.email;
        btns.forEach(btn => {
            btn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
            btn.style.borderColor = 'var(--accent-color)';
        });
    } else {
        btns.forEach(btn => {
            btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Login`;
            btn.style.borderColor = 'var(--glass-border)';
        });
    }
}

function openLoginModal() {
    if (currentUser) {
        // Logout
        signOut().then(() => {
            currentUser = null;
            userFavorites.clear();
            updateLoginButtons();
            renderApp();
            renderFavoritPage();
            renderHomeResults();
            updateFavCounter();
        });
        return;
    }
    loginFormContainer.style.display = 'block';
    registerFormContainer.style.display = 'none';
    loginError.style.display = 'none';
    loginError.classList.remove('visible');
    loginUsername.value = '';
    loginPassword.value = '';
    loginModal.classList.add('active');
    loginUsername.focus();
}

function closeModalLogin() {
    loginModal.classList.remove('active');
}

loginBtnHeader.addEventListener('click', openLoginModal);
loginBtnHome.addEventListener('click', openLoginModal);
closeLoginModal.addEventListener('click', closeModalLogin);
loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeModalLogin();
});

switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.style.display = 'none';
    registerFormContainer.style.display = 'block';
    registerError.style.display = 'none';
    registerError.classList.remove('visible');
    registerUsername.value = '';
    registerEmail.value = '';
    registerPassword.value = '';
    registerConfirmPassword.value = '';
    registerUsername.focus();
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.style.display = 'block';
    registerFormContainer.style.display = 'none';
    loginError.style.display = 'none';
    loginError.classList.remove('visible');
    loginUsername.value = '';
    loginPassword.value = '';
    loginUsername.focus();
});

// Login submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';
    loginError.style.display = 'none';
    loginError.classList.remove('visible');

    const email = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    try {
        await signIn(email, password);
        closeModalLogin();
    } catch (error) {
        loginError.textContent = '❌ ' + error.message;
        loginError.style.display = 'block';
        loginError.classList.add('visible');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Masuk';
    }
});

// Register submit
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';
    registerError.style.display = 'none';
    registerError.classList.remove('visible');

    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value.trim();
    const confirm = registerConfirmPassword.value.trim();

    if (password !== confirm) {
        registerError.textContent = '❌ Password dan konfirmasi tidak cocok!';
        registerError.style.display = 'block';
        registerError.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Daftar';
        return;
    }
    if (password.length < 6) {
        registerError.textContent = '❌ Password minimal 6 karakter!';
        registerError.style.display = 'block';
        registerError.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Daftar';
        return;
    }
    try {
        await signUp(email, password, username);
        alert('✅ Pendaftaran berhasil! Silakan login.');
        switchToLogin.click();
    } catch (error) {
        registerError.textContent = '❌ ' + error.message;
        registerError.style.display = 'block';
        registerError.classList.add('visible');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Daftar';
    }
});

// Google login
googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithGoogle();
        closeModalLogin();
    } catch (error) {
        alert('Google login gagal: ' + error.message);
    }
});

emailLoginBtn.addEventListener('click', () => {
    loginUsername.focus();
});

const termsData = [
// Entri Huruf A
    { id: 1, arab: "الانحراف", transliterasi: "al-Inḥirāf", indo: "Aberasi", inggris: "Aberration", definisi: "Penyimpangan posisi bintang akibat gerak Bumi.", link: "https://id.wikipedia.org/wiki/Aberasi_cahaya", huruf: "A", hurufHijaiyah: "ا" },
    { id: 2, arab: "امتصاص النور", transliterasi: "Imtiṣāṣ an-Nūr", indo: "Penyerapan Cahaya", inggris: "Absorption of light", definisi: "Proses penyerapan energi cahaya oleh materi.", link: "https://en.wikipedia.org/wiki/Absorption_(electromagnetic_radiation)", huruf: "P", hurufHijaiyah: "ا" },
    { id: 3, arab: "آخر النهر", transliterasi: "Ākhir an-Nahr", indo: "Achernar", inggris: "Acarnar or Achernar", definisi: "Bintang tercerah di rasi Eridanus.", link: "https://id.wikipedia.org/wiki/Achernar", huruf: "A", hurufHijaiyah: "آ" },
    { id: 4, arab: "التسارع", transliterasi: "at-Tasāruʿ", indo: "Percepatan", inggris: "Acceleration", definisi: "Perubahan kecepatan benda per satuan waktu.", link: "https://id.wikipedia.org/wiki/Percepatan", huruf: "P", hurufHijaiyah: "ت" },
    { id: 5, arab: "التلسكوب الصافي", transliterasi: "at-Tiliskūb aṣ-Ṣāfī", indo: "Teleskop Akromatik", inggris: "Achromatic telescope", definisi: "Teleskop lensa bebas aberasi warna.", link: "https://id.wikipedia.org/wiki/Teleskop_akromatik", huruf: "T", hurufHijaiyah: "ت" },
    { id: 6, arab: "العذارى", transliterasi: "al-ʿAdhārā", indo: "Adhara", inggris: "Adara or Adhara", definisi: "Bintang tercerah kedua di rasi Canis Major.", link: "https://en.wikipedia.org/wiki/Epsilon_Canis_Majoris", huruf: "A", hurufHijaiyah: "ع" },
    { id: 7, arab: "الأثير", transliterasi: "al-Athīr", indo: "Eter", inggris: "Aether", definisi: "Media hipotetis perambatan cahaya di masa lalu.", link: "https://id.wikipedia.org/wiki/Eter_(fisika)", huruf: "E", hurufHijaiyah: "أ" },
    { id: 8, arab: "البياض", transliterasi: "al-Bayāḍ", indo: "Albedo", inggris: "Albedo", definisi: "Daya pantul permukaan benda langit.", link: "https://id.wikipedia.org/wiki/Albedo", huruf: "A", hurufHijaiyah: "ب" },
    { id: 9, arab: "منقار الدجاجة", transliterasi: "Minqār ad-Dajājah", indo: "Albireo", inggris: "Albireo", definisi: "Bintang biner di rasi Cygnus.", link: "https://id.wikipedia.org/wiki/Albireo", huruf: "A", hurufHijaiyah: "م" },
    { id: 10, arab: "الدَبران", transliterasi: "ad-Dabarān", indo: "Aldebaran", inggris: "Aldebaran", definisi: "Bintang raksasa merah di rasi Taurus.", link: "https://id.wikipedia.org/wiki/Aldebaran", huruf: "A", hurufHijaiyah: "د" },
    { id: 11, arab: "الجبّار", transliterasi: "al-Jabbār", indo: "Aljabar", inggris: "Algebar, Algibbar, Algebra", definisi: "Bintang raksasa di rasi Orion (Betelgeuse).", link: "https://id.wikipedia.org/wiki/Betelgeuse", huruf: "A", hurufHijaiyah: "ج" },
    { id: 12, arab: "الغول", transliterasi: "al-Ghūl", indo: "Algol", inggris: "Algol, Demon star", definisi: "Bintang variabel gerhana di rasi Perseus.", link: "https://id.wikipedia.org/wiki/Algol", huruf: "A", hurufHijaiyah: "غ" },
    { id: 13, arab: "الألية", transliterasi: "al-Alyah", indo: "Alioth", inggris: "Alioth", definisi: "Bintang tercerah di rasi Ursa Major.", link: "https://id.wikipedia.org/wiki/Alioth", huruf: "A", hurufHijaiyah: "أ" },
    { id: 14, arab: "عناق الأرض", transliterasi: "ʿInāq al-Arḍ", indo: "Almach", inggris: "Almach, Almaek, Almak", definisi: "Bintang biner di rasi Andromeda.", link: "https://id.wikipedia.org/wiki/Almach", huruf: "A", hurufHijaiyah: "ع" },
    { id: 15, arab: "روزنامة", transliterasi: "Rūznāmah", indo: "Almanak", inggris: "Almanac", definisi: "Tabel data posisi benda langit tahunan.", link: "https://id.wikipedia.org/wiki/Almanak", huruf: "A", hurufHijaiyah: "ر" },
    { id: 16, arab: "الفرد", transliterasi: "al-Fard", indo: "Alphard", inggris: "Alfard, Alphard", definisi: "Bintang tercerah di rasi Hydra.", link: "https://id.wikipedia.org/wiki/Alphard", huruf: "A", hurufHijaiyah: "ف" },
    { id: 17, arab: "الفرس", transliterasi: "al-Faras", indo: "Alpheratz", inggris: "Alpherat, Alpheratz", definisi: "Bintang di rasi Andromeda dan Pegasus.", link: "https://id.wikipedia.org/wiki/Alpheratz", huruf: "A", hurufHijaiyah: "ف" },
    { id: 18, arab: "الاثافي", transliterasi: "al-Athāfī", indo: "Alsafi", inggris: "Alsafi", definisi: "Bintang di rasi Draco.", link: "https://en.wikipedia.org/wiki/Sigma_Draconis", huruf: "A", hurufHijaiyah: "ا" },
    { id: 19, arab: "الشاهين", transliterasi: "ash-Shāhīn", indo: "Alshain", inggris: "Alshain", definisi: "Bintang di rasi Aquila.", link: "https://en.wikipedia.org/wiki/Beta_Aquilae", huruf: "A", hurufHijaiyah: "ش" },
    { id: 20, arab: "الشاة", transliterasi: "ash-Shāt", indo: "Alshat", inggris: "Alshat", definisi: "Bintang di rasi Sculptor.", link: "https://en.wikipedia.org/wiki/Alshat", huruf: "A", hurufHijaiyah: "ش" },
    { id: 21, arab: "النسر الطائر", transliterasi: "an-Nasr aṭ-Ṭā'ir", indo: "Altair", inggris: "Altair", definisi: "Bintang tercerah di rasi Aquila.", link: "https://id.wikipedia.org/wiki/Altair", huruf: "A", hurufHijaiyah: "ن" },
    { id: 22, arab: "العذراء", transliterasi: "al-ʿAdhrā'", indo: "Alzara", inggris: "Alzara", definisi: "Nama lain untuk rasi Virgo.", link: "https://id.wikipedia.org/wiki/Virgo", huruf: "A", hurufHijaiyah: "ع" },
    { id: 23, arab: "سعة", transliterasi: "Saʿah", indo: "Amplitudo", inggris: "Amplitude", definisi: "Sudut benda langit dari titik timur-barat.", link: "https://id.wikipedia.org/wiki/Amplitudo", huruf: "A", hurufHijaiyah: "س" },
    { id: 24, arab: "زاوية", transliterasi: "Zāwiyah", indo: "Sudut", inggris: "Angle", definisi: "Ukuran jarak antara dua garis.", link: "https://id.wikipedia.org/wiki/Sudut", huruf: "S", hurufHijaiyah: "ز" },
    { id: 25, arab: "كسوف حلقي", transliterasi: "Kusūf Ḥalaqī", indo: "Gerhana Cincin", inggris: "Annular Eclipse", definisi: "Gerhana Matahari dengan cincin cahaya.", link: "https://id.wikipedia.org/wiki/Gerhana_matahari_cincin", huruf: "G", hurufHijaiyah: "ك" },
    { id: 26, arab: "المرأة المسلسلة", transliterasi: "al-Mar'ah al-Musalsalah", indo: "Andromeda", inggris: "Andromeda", definisi: "Galaksi spiral terdekat dengan Bimasakti.", link: "https://id.wikipedia.org/wiki/Galaksi_Andromeda", huruf: "A", hurufHijaiyah: "م" },
    { id: 27, arab: "قلب العقرب", transliterasi: "Qalb al-ʿAqrab", indo: "Antares", inggris: "Antares", definisi: "Bintang raksasa merah di rasi Scorpius.", link: "https://id.wikipedia.org/wiki/Antares", huruf: "A", hurufHijaiyah: "ق" },
    { id: 28, arab: "انطينؤوس", transliterasi: "Anṭīnūs", indo: "Antinoüs", inggris: "Antinoüs", definisi: "Rasi bintang yang sudah tidak digunakan lagi.", link: "https://en.wikipedia.org/wiki/Antinous_(constellation)", huruf: "A", hurufHijaiyah: "ا" },
    { id: 29, arab: "برج الدلو", transliterasi: "Burj ad-Dalū", indo: "Aquarius", inggris: "Aquarius", definisi: "Rasi zodiak ke-11.", link: "https://id.wikipedia.org/wiki/Aquarius", huruf: "A", hurufHijaiyah: "ب" },
    { id: 30, arab: "العقاب", transliterasi: "al-ʿUqāb", indo: "Aquila", inggris: "Aquila", definisi: "Rasi bintang di ekuator langit.", link: "https://id.wikipedia.org/wiki/Aquila_(rasi_bintang)", huruf: "A", hurufHijaiyah: "ع" },
    { id: 31, arab: "السِماك الرامِح", transliterasi: "as-Simāk ar-Rāmiḥ", indo: "Arcturus", inggris: "Arcturus", definisi: "Bintang tercerah di rasi Boötes.", link: "https://id.wikipedia.org/wiki/Arcturus", huruf: "A", hurufHijaiyah: "س" },
    { id: 32, arab: "الحمل", transliterasi: "al-Ḥamal", indo: "Aries", inggris: "Aries", definisi: "Rasi zodiak pertama.", link: "https://id.wikipedia.org/wiki/Aries", huruf: "A", hurufHijaiyah: "ح" },
    { id: 33, arab: "أفق صناعي", transliterasi: "Ufuq Ṣināʿī", indo: "Horizon Buatan", inggris: "Artificial Horizon", definisi: "Alat untuk mengukur ketinggian benda langit.", link: "https://en.wikipedia.org/wiki/Artificial_horizon", huruf: "H", hurufHijaiyah: "أ" },
    { id: 34, arab: "قمر اصطناعي", transliterasi: "Qamar Iṣṭināʿī", indo: "Satelit Buatan", inggris: "Artificial Satellite", definisi: "Satelit buatan manusia yang mengorbit Bumi.", link: "https://id.wikipedia.org/wiki/Satelit_buatan", huruf: "S", hurufHijaiyah: "ق" },
    { id: 35, arab: "الرأس", transliterasi: "ar-Ra's", indo: "Apex", inggris: "Apex", definisi: "Titik tertinggi di langit.", link: "https://en.wikipedia.org/wiki/Apex_(astronomy)", huruf: "A", hurufHijaiyah: "ر" },
    { id: 36, arab: "نقطة الذنب", transliterasi: "Nuqṭat adh-Dhanab", indo: "Aphelion", inggris: "Aphelion", definisi: "Titik terjauh planet dari Matahari.", link: "https://id.wikipedia.org/wiki/Aphelion", huruf: "A", hurufHijaiyah: "ن" },
    { id: 37, arab: "الأوج", transliterasi: "al-Awj", indo: "Apogee", inggris: "Apogee", definisi: "Titik terjauh Bulan dari Bumi.", link: "https://id.wikipedia.org/wiki/Apogeum", huruf: "A", hurufHijaiyah: "أ" },
    { id: 38, arab: "أبولو", transliterasi: "Abūlū", indo: "Apolo", inggris: "Apollo", definisi: "Misi luar angkasa AS yang mendarat di Bulan.", link: "https://id.wikipedia.org/wiki/Program_Apollo", huruf: "A", hurufHijaiyah: "أ" },
    { id: 39, arab: "الرؤية", transliterasi: "ar-Ru'yah", indo: "Kemunculan", inggris: "Apparition", definisi: "Munculnya benda langit di ufuk.", link: "https://en.wikipedia.org/wiki/Apparition", huruf: "K", hurufHijaiyah: "ر" },
    { id: 40, arab: "الاسدة", transliterasi: "al-Asadah", indo: "Asadah", inggris: "Asadah", definisi: "Nama lain untuk rasi Leo.", link: "https://id.wikipedia.org/wiki/Leo_(rasi_bintang)", huruf: "A", hurufHijaiyah: "ا" },
    { id: 41, arab: "ابط الرامي", transliterasi: "Ibṭ ar-Rāmī", indo: "Ascella", inggris: "Ascella", definisi: "Bintang di rasi Sagittarius.", link: "https://en.wikipedia.org/wiki/Ascella", huruf: "A", hurufHijaiyah: "ا" },
    { id: 42, arab: "الصعود", transliterasi: "aṣ-Ṣu'ūd", indo: "Kenaikan", inggris: "Ascension", definisi: "Kenaikan benda langit di ufuk.", link: "https://id.wikipedia.org/wiki/Asensio_rekta", huruf: "K", hurufHijaiyah: "ص" },
    { id: 43, arab: "النجيمات", transliterasi: "an-Nujaymāt", indo: "Asteroid", inggris: "Asteroids", definisi: "Benda langit kecil pengorbit Matahari.", link: "https://id.wikipedia.org/wiki/Asteroid", huruf: "A", hurufHijaiyah: "ن" },
    { id: 44, arab: "النجومي", transliterasi: "an-Nujūmī", indo: "Astral", inggris: "Astral", definisi: "Berhubungan dengan bintang-bintang.", link: "https://en.wikipedia.org/wiki/Astral", huruf: "A", hurufHijaiyah: "ن" },
    { id: 45, arab: "الأسطرلاب", transliterasi: "al-Asturlāb", indo: "Astrolab", inggris: "Astrolabe", definisi: "Alat astronomi kuno pengukur posisi bintang.", link: "https://id.wikipedia.org/wiki/Astrolab", huruf: "A", hurufHijaiyah: "أ" },
    { id: 46, arab: "رائد فضاء", transliterasi: "Rā'id Faḍā'", indo: "Astronaut", inggris: "Astronaut", definisi: "Penjelajah luar angkasa.", link: "https://id.wikipedia.org/wiki/Astronot", huruf: "A", hurufHijaiyah: "ر" },
    { id: 47, arab: "علم الفلك", transliterasi: "ʿIlm al-Falak", indo: "Astronomi", inggris: "Astronomy", definisi: "Ilmu yang mempelajari benda-benda langit.", link: "https://id.wikipedia.org/wiki/Astronomi", huruf: "A", hurufHijaiyah: "ع" },
    { id: 48, arab: "فنّ التنجيم", transliterasi: "Fann at-Tanjīm", indo: "Astrologi", inggris: "Astrology", definisi: "Ramalan berdasarkan posisi bintang.", link: "https://id.wikipedia.org/wiki/Astrologi", huruf: "A", hurufHijaiyah: "ف" },
    { id: 49, arab: "فَلَكي", transliterasi: "Falakī", indo: "Astronom", inggris: "Astronomer", definisi: "Ilmuwan yang mempelajari astronomi.", link: "https://id.wikipedia.org/wiki/Astronom", huruf: "A", hurufHijaiyah: "ف" },
    { id: 50, arab: "الفلك الطبيعي", transliterasi: "al-Falak aṭ-Ṭabīʿī", indo: "Astrofisika", inggris: "Astrophysics", definisi: "Cabang astronomi tentang fisika alam semesta.", link: "https://id.wikipedia.org/wiki/Astrofisika", huruf: "A", hurufHijaiyah: "ف" },
    { id: 51, arab: "الأطلس", transliterasi: "al-Aṭlas", indo: "Atlas", inggris: "Atlas", definisi: "Kumpulan peta bintang atau langit.", link: "https://id.wikipedia.org/wiki/Atlas_(kartografi)", huruf: "A", hurufHijaiyah: "أ" },
    { id: 52, arab: "الجو", transliterasi: "al-Jaww", indo: "Atmosfer", inggris: "Atmosphere", definisi: "Lapisan gas yang menyelimuti planet.", link: "https://id.wikipedia.org/wiki/Atmosfer", huruf: "A", hurufHijaiyah: "ج" },
    { id: 53, arab: "جذب", transliterasi: "Jadhb", indo: "Gravitasi", inggris: "Attraction", definisi: "Gaya tarik-menarik antara benda bermassa.", link: "https://id.wikipedia.org/wiki/Gravitasi", huruf: "G", hurufHijaiyah: "ج" },
    { id: 54, arab: "الشفق القطبي", transliterasi: "ash-Shafaq al-Quṭbī", indo: "Aurora", inggris: "Aurora Borealis", definisi: "Cahaya di langit kutub Utara.", link: "https://id.wikipedia.org/wiki/Aurora", huruf: "A", hurufHijaiyah: "ش" },
    { id: 55, arab: "نقطة الإعتدال الخريفي", transliterasi: "Nuqṭat al-Iʿtidāl al-Kharīfī", indo: "Ekuinoks Musim Gugur", inggris: "Autumnal Equinox", definisi: "Titik perpotongan ekliptika dan ekuator.", link: "https://id.wikipedia.org/wiki/Ekuinoks", huruf: "E", hurufHijaiyah: "ن" },
    { id: 56, arab: "معدّل", transliterasi: "Muʿaddal", indo: "Rata-rata", inggris: "Average", definisi: "Nilai tengah dari sekumpulan data.", link: "https://id.wikipedia.org/wiki/Rata-rata", huruf: "R", hurufHijaiyah: "م" },
    { id: 57, arab: "المحور", transliterasi: "al-Miḥwar", indo: "Sumbu", inggris: "Axis", definisi: "Garis imajiner tempat benda berputar.", link: "https://id.wikipedia.org/wiki/Sumbu", huruf: "S", hurufHijaiyah: "م" },
    { id: 58, arab: "السَّمت", transliterasi: "as-Samt", indo: "Azimuth", inggris: "Azimuth", definisi: "Sudut arah benda langit dari utara.", link: "https://id.wikipedia.org/wiki/Azimut", huruf: "A", hurufHijaiyah: "س" },

// Entri Huruf B
    { id: 59, arab: "میزان", transliterasi: "Mīzān", indo: "Mizan", inggris: "Balance", definisi: "Nama Arab untuk rasi Libra atau bintang utamanya.", link: "https://id.wikipedia.org/wiki/Libra_(rasi_bintang)", huruf: "M", hurufHijaiyah: "م" },
    { id: 60, arab: "الناجذ", transliterasi: "an-Nājiż", indo: "Bellatrix", inggris: "Bellatrix", definisi: "Bintang raksasa biru tercerah ketiga di rasi Orion.", link: "https://id.wikipedia.org/wiki/Bellatrix", huruf: "B", hurufHijaiyah: "ن" },
    { id: 61, arab: "مناطق", transliterasi: "Manāṭiq", indo: "Sabuk", inggris: "Belts", definisi: "Zona atau sabuk pembagian di langit, misalnya sabuk zodiak.", link: "https://en.wikipedia.org/wiki/Belt_(astronomy)", huruf: "S", hurufHijaiyah: "م" },
    { id: 62, arab: "منطقة الابراج", transliterasi: "Minṭaqat al-Abrāj", indo: "Sabuk Zodiak", inggris: "Belt of Ecliptic", definisi: "Jalur semu Matahari di antara rasi bintang zodiak.", link: "https://id.wikipedia.org/wiki/Ekliptika", huruf: "S", hurufHijaiyah: "م" },
    { id: 63, arab: "الانفجار الاعظم", transliterasi: "al-Infijār al-A'ẓam", indo: "Big Bang", inggris: "Big Bang", definisi: "Ledakan dahsyat yang mengawali pembentukan alam semesta.", link: "https://id.wikipedia.org/wiki/Ledakan_Dahsyat", huruf: "B", hurufHijaiyah: "ا" },
    { id: 64, arab: "ثنائي", transliterasi: "Ṡunā'ī", indo: "Biner", inggris: "Binary", definisi: "Sistem yang memiliki dua komponen atau dua unsur.", link: "https://id.wikipedia.org/wiki/Biner", huruf: "B", hurufHijaiyah: "ث" },
    { id: 65, arab: "النجوم الثنائية", transliterasi: "an-Nujūm aṡ-Ṡunā'iyyah", indo: "Bintang Biner", inggris: "Binary Stars", definisi: "Dua bintang yang terikat gravitasi dan saling mengorbit.", link: "https://id.wikipedia.org/wiki/Bintang_biner", huruf: "B", hurufHijaiyah: "ن" },
    { id: 66, arab: "نظارة مزدوجة", transliterasi: "Naẓẓārah Muzdawijah", indo: "Teropong", inggris: "Binocular", definisi: "Alat optik genggam dua lensa untuk mengamati langit.", link: "https://id.wikipedia.org/wiki/Teropong", huruf: "T", hurufHijaiyah: "ن" },
    { id: 67, arab: "ذو نواتين", transliterasi: "Żū Nawātayn", indo: "Binuklir", inggris: "Binuclear", definisi: "Objek langit (seperti galaksi) yang memiliki dua inti.", link: "https://en.wikipedia.org/wiki/Binuclear_cell", huruf: "B", hurufHijaiyah: "ذ" },
    { id: 68, arab: "ثقب أسود", transliterasi: "Ṡaqb Aswad", indo: "Lubang Hitam", inggris: "Black Hole", definisi: "Region ruang-waktu dengan gravitasi superkuat, cahaya pun terperangkap.", link: "https://id.wikipedia.org/wiki/Lubang_hitam", huruf: "L", hurufHijaiyah: "ث" },
    { id: 69, arab: "كرة نارية", transliterasi: "Kurah Nāriyyah", indo: "Bolide", inggris: "Bolide", definisi: "Meteroid yang sangat terang dan meledak di atmosfer Bumi.", link: "https://id.wikipedia.org/wiki/Bolid", huruf: "B", hurufHijaiyah: "ك" },

// Entri Huruf C
    { id: 70, arab: "آلة النقاش", transliterasi: "Ālah an-Naqqāsh", indo: "Rasi Caelum", inggris: "Caelum", definisi: "Rasi bintang kecil di langit selatan.", link: "https://id.wikipedia.org/wiki/Caelum", huruf: "R", hurufHijaiyah: "ا" },
    { id: 71, arab: "روزنامة", transliterasi: "Rūznāmah", indo: "Kalender", inggris: "Calendar", definisi: "Sistem penanggalan berdasarkan peredaran langit.", link: "https://id.wikipedia.org/wiki/Kalender", huruf: "K", hurufHijaiyah: "ر" },
    { id: 72, arab: "كالوري", transliterasi: "Kālūrī", indo: "Kalori", inggris: "Calorie", definisi: "Satuan energi panas dalam fisika astronomi.", link: "https://id.wikipedia.org/wiki/Kalori", huruf: "K", hurufHijaiyah: "ك" },
    { id: 73, arab: "تُرع", transliterasi: "Turʿ", indo: "Kanal", inggris: "Canals", definisi: "Saluran atau alur di permukaan planet (misal Mars).", link: "https://en.wikipedia.org/wiki/Martian_canals", huruf: "K", hurufHijaiyah: "ت" },
    { id: 74, arab: "السرطان", transliterasi: "as-Saraṭān", indo: "Rasi Cancer", inggris: "Cancer", definisi: "Rasi zodiak ke-4 yang berbentuk kepiting.", link: "https://id.wikipedia.org/wiki/Cancer_(rasi_bintang)", huruf: "R", hurufHijaiyah: "س" },
    { id: 75, arab: "الكلب الأكبر", transliterasi: "al-Kalb al-Akbar", indo: "Rasi Canis Major", inggris: "Canis Major", definisi: "Rasi anjing besar yang berisi bintang Sirius.", link: "https://id.wikipedia.org/wiki/Canis_Major", huruf: "R", hurufHijaiyah: "ك" },
    { id: 76, arab: "الكلب الأصفر", transliterasi: "al-Kalb al-Aṣfar", indo: "Rasi Canis Minor", inggris: "Canis Minor", definisi: "Rasi anjing kecil yang berisi bintang Procyon.", link: "https://id.wikipedia.org/wiki/Canis_Minor", huruf: "R", hurufHijaiyah: "ك" },
    { id: 77, arab: "سُهيل", transliterasi: "Suhayl", indo: "Bintang Canopus", inggris: "Canopus", definisi: "Bintang tercerah kedua di langit malam.", link: "https://id.wikipedia.org/wiki/Canopus", huruf: "B", hurufHijaiyah: "س" },
    { id: 78, arab: "العَيّوق", transliterasi: "al-ʿAyyūq", indo: "Bintang Capella", inggris: "Capella", definisi: "Bintang tercerah di rasi Auriga.", link: "https://id.wikipedia.org/wiki/Capella", huruf: "B", hurufHijaiyah: "ع" },
    { id: 79, arab: "الجَدي", transliterasi: "al-Jady", indo: "Rasi Capricorn", inggris: "Capricorn", definisi: "Rasi zodiak ke-10 yang berbentuk kambing laut.", link: "https://id.wikipedia.org/wiki/Capricornus", huruf: "R", hurufHijaiyah: "ج" },
    { id: 80, arab: "برنامج", transliterasi: "Barnāmaj", indo: "Katalog", inggris: "Catalogue", definisi: "Daftar sistematis objek-objek langit.", link: "https://id.wikipedia.org/wiki/Katalog_astronomi", huruf: "K", hurufHijaiyah: "ب" },
    { id: 81, arab: "سماوي", transliterasi: "Samāwī", indo: "Selestial", inggris: "Celestial", definisi: "Berhubungan dengan langit atau angkasa luar.", link: "https://en.wikipedia.org/wiki/Celestial", huruf: "S", hurufHijaiyah: "س" },
    { id: 82, arab: "قِنطُورس", transliterasi: "Qinṭūrus", indo: "Rasi Centaurus", inggris: "Centaurus", definisi: "Rasi besar di selatan yang berisi Alpha Centauri.", link: "https://id.wikipedia.org/wiki/Centaurus", huruf: "R", hurufHijaiyah: "ق" },
    { id: 83, arab: "قيفاوس", transliterasi: "Qīfāwus", indo: "Rasi Cepheus", inggris: "Cepheus", definisi: "Rasi bintang di utara yang dinamai raja Ethiopia.", link: "https://id.wikipedia.org/wiki/Cepheus_(rasi_bintang)", huruf: "R", hurufHijaiyah: "ق" },
    { id: 84, arab: "قيطس", transliterasi: "Qīṭus", indo: "Rasi Cetus", inggris: "Cetus", definisi: "Rasi bintang paus di ekuator langit.", link: "https://id.wikipedia.org/wiki/Cetus", huruf: "R", hurufHijaiyah: "ق" },
    { id: 85, arab: "الحِرباء", transliterasi: "al-Ḥirbā'", indo: "Rasi Chamaeleon", inggris: "Chamaeleon", definisi: "Rasi kecil di langit kutub selatan.", link: "https://id.wikipedia.org/wiki/Chamaeleon", huruf: "R", hurufHijaiyah: "ح" },
    { id: 86, arab: "السَّلوقي الثاني", transliterasi: "as-Salūqī ath-Thānī", indo: "Bintang Chara", inggris: "Chara", definisi: "Bintang di rasi Canes Venatici.", link: "https://en.wikipedia.org/wiki/Beta_Canum_Venaticorum", huruf: "B", hurufHijaiyah: "س" },
    { id: 87, arab: "جوّ الشمس", transliterasi: "Jaww ash-Shams", indo: "Kromosfer", inggris: "Chromosphere", definisi: "Lapisan atmosfer Matahari di atas fotosfer.", link: "https://id.wikipedia.org/wiki/Kromosfer", huruf: "K", hurufHijaiyah: "ج" },
    { id: 88, arab: "كرونوغراف", transliterasi: "Kurūnūghrāf", indo: "Kronograf", inggris: "Chronograph", definisi: "Alat untuk merekam waktu secara presisi.", link: "https://id.wikipedia.org/wiki/Kronograf", huruf: "K", hurufHijaiyah: "ك" },
    { id: 89, arab: "مُؤَقِّتَة", transliterasi: "Mu'waqqitah", indo: "Kronometer", inggris: "Chronometer", definisi: "Jam dengan ketelitian tinggi untuk navigasi.", link: "https://id.wikipedia.org/wiki/Kronometer", huruf: "K", hurufHijaiyah: "م" },
    { id: 90, arab: "دائرة", transliterasi: "Dā'irah", indo: "Lingkaran", inggris: "Circle", definisi: "Bentuk geometri atau jalur edar di langit.", link: "https://id.wikipedia.org/wiki/Lingkaran", huruf: "L", hurufHijaiyah: "د" },
    { id: 91, arab: "اليوم المدني", transliterasi: "al-Yawm al-Madanī", indo: "Hari Sipil", inggris: "Civil day", definisi: "Hari berdasarkan perputaran Bumi selama 24 jam.", link: "https://id.wikipedia.org/wiki/Hari", huruf: "H", hurufHijaiyah: "ي" },
    { id: 92, arab: "المناخ", transliterasi: "al-Manākh", indo: "Iklim", inggris: "Climate", definisi: "Pola cuaca jangka panjang di suatu wilayah.", link: "https://id.wikipedia.org/wiki/Iklim", huruf: "I", hurufHijaiyah: "م" },
    { id: 93, arab: "طابق", transliterasi: "Ṭābaqa", indo: "Bertepatan", inggris: "Coincide", definisi: "Dua peristiwa langit yang terjadi pada waktu sama.", link: "https://en.wikipedia.org/wiki/Conjunction_(astronomy)", huruf: "B", hurufHijaiyah: "ط" },
    { id: 94, arab: "المذنبات", transliterasi: "al-Mudhanabāt", indo: "Komet", inggris: "Comets", definisi: "Benda es dan debu yang mengorbit Matahari.", link: "https://id.wikipedia.org/wiki/Komet", huruf: "K", hurufHijaiyah: "م" },
    { id: 95, arab: "الحك", transliterasi: "al-Ḥakk", indo: "Kompas", inggris: "Compass", definisi: "Alat penunjuk arah utara magnetis.", link: "https://id.wikipedia.org/wiki/Kompas", huruf: "K", hurufHijaiyah: "ح" },
    { id: 96, arab: "مخروط", transliterasi: "Makhrūṭ", indo: "Kerucut", inggris: "Cone", definisi: "Bentuk kerucut, misalnya bayangan umbra gerhana.", link: "https://id.wikipedia.org/wiki/Kerucut", huruf: "K", hurufHijaiyah: "م" },
    { id: 97, arab: "صورة", transliterasi: "Ṣūrah", indo: "Konfigurasi", inggris: "Configuration", definisi: "Susunan geometri posisi benda-benda langit.", link: "https://en.wikipedia.org/wiki/Configuration_(geometry)", huruf: "K", hurufHijaiyah: "ص" },
    { id: 98, arab: "اقتران", transliterasi: "Iqtirān", indo: "Konjungsi", inggris: "Conjunction", definisi: "Dua benda langit dalam bujur ekliptika sama.", link: "https://id.wikipedia.org/wiki/Konjungsi_(astronomi)", huruf: "K", hurufHijaiyah: "ا" },
    { id: 99, arab: "كمية ثابتة", transliterasi: "Kamiyyah Thābitah", indo: "Konstanta", inggris: "Constant", definisi: "Nilai tetap yang tidak berubah dalam perhitungan.", link: "https://id.wikipedia.org/wiki/Konstanta", huruf: "K", hurufHijaiyah: "ك" },
    { id: 100, arab: "منطقة الظهور الدائم", transliterasi: "Minṭaqat aẓ-Ẓuhūr ad-Dā'im", indo: "Lingkaran Kutub", inggris: "Constant Apparition", definisi: "Wilayah di sekitar kutub yang selalu terlihat.", link: "https://en.wikipedia.org/wiki/Circumpolar_star", huruf: "L", hurufHijaiyah: "م" },
    { id: 101, arab: "كوكبة", transliterasi: "Kawkabah", indo: "Rasi Bintang", inggris: "Constellation", definisi: "Kumpulan bintang yang membentuk pola tertentu.", link: "https://id.wikipedia.org/wiki/Rasi_bintang", huruf: "R", hurufHijaiyah: "ك" },
    { id: 102, arab: "تركيب", transliterasi: "Tarkīb", indo: "Komposisi", inggris: "Constitution", definisi: "Susunan atau kandungan materi benda langit.", link: "https://id.wikipedia.org/wiki/Komposisi", huruf: "K", hurufHijaiyah: "ت" },
    { id: 103, arab: "تقليص", transliterasi: "Taqlīṣ", indo: "Kontraksi", inggris: "Contraction", definisi: "Pengurangan ukuran atau volume benda langit.", link: "https://id.wikipedia.org/wiki/Kontraksi", huruf: "K", hurufHijaiyah: "ت" },
    { id: 104, arab: "الاكليل", transliterasi: "al-Iklīl", indo: "Korona", inggris: "Corona", definisi: "Lapisan terluar atmosfer Matahari yang sangat panas.", link: "https://id.wikipedia.org/wiki/Korona_matahari", huruf: "K", hurufHijaiyah: "ا" },
    { id: 105, arab: "الاحداثيات", transliterasi: "al-Iḥdāthiyyāt", indo: "Koordinat", inggris: "Co-ordinates", definisi: "Sistem koordinat untuk menentukan posisi langit.", link: "https://id.wikipedia.org/wiki/Sistem_koordinat_langit", huruf: "K", hurufHijaiyah: "ا" },
    { id: 106, arab: "الغُراب", transliterasi: "al-Ghurāb", indo: "Rasi Corvus", inggris: "Corvus", definisi: "Rasi burung gagak di langit selatan.", link: "https://id.wikipedia.org/wiki/Corvus_(rasi_bintang)", huruf: "R", hurufHijaiyah: "غ" },
    { id: 107, arab: "كَوني", transliterasi: "Kawnī", indo: "Kosmik", inggris: "Cosmical", definisi: "Berkaitan dengan alam semesta secara keseluruhan.", link: "https://id.wikipedia.org/wiki/Kosmik", huruf: "K", hurufHijaiyah: "ك" },
    { id: 108, arab: "الأشعة الكونية", transliterasi: "al-Ash'ah al-Kawniyyah", indo: "Sinar Kosmik", inggris: "Cosmic Ray", definisi: "Partikel berenergi tinggi yang berasal dari luar angkasa.", link: "https://id.wikipedia.org/wiki/Sinar_kosmik", huruf: "S", hurufHijaiyah: "ا" },
    { id: 109, arab: "بدء الخليقة", transliterasi: "Bad' al-Khalīqah", indo: "Kosmogoni", inggris: "Cosmogony", definisi: "Teori ilmiah tentang asal-usul alam semesta.", link: "https://id.wikipedia.org/wiki/Kosmogoni", huruf: "K", hurufHijaiyah: "ب" },
    { id: 110, arab: "فوهة البراكين", transliterasi: "Fawhat al-Barākīn", indo: "Kawah", inggris: "Crater", definisi: "Cekungan berbentuk mangkuk di permukaan benda langit.", link: "https://id.wikipedia.org/wiki/Kawah_tumbukan", huruf: "K", hurufHijaiyah: "ف" },
    { id: 111, arab: "الصليب الجنوبي", transliterasi: "aṣ-Ṣalīb al-Janūbī", indo: "Rasi Crux", inggris: "Crux", definisi: "Rasi salib selatan yang kecil namun terang.", link: "https://id.wikipedia.org/wiki/Crux", huruf: "R", hurufHijaiyah: "ص" },
    { id: 112, arab: "مُكَعَّب", transliterasi: "Muka''ab", indo: "Kubus", inggris: "Cube", definisi: "Bentuk geometri tiga dimensi bersisi enam.", link: "https://id.wikipedia.org/wiki/Kubus", huruf: "K", hurufHijaiyah: "م" },
    { id: 113, arab: "المنْحنى", transliterasi: "al-Munḥanā", indo: "Kurva", inggris: "Curve", definisi: "Garis lengkung, misalnya lintasan orbit planet.", link: "https://id.wikipedia.org/wiki/Kurva", huruf: "K", hurufHijaiyah: "م" },
    { id: 114, arab: "مُنْحَنٍ", transliterasi: "Munḥanin", indo: "Melengkung", inggris: "Curved", definisi: "Bentuk atau lintasan yang tidak lurus.", link: "https://id.wikipedia.org/wiki/Kurva", huruf: "M", hurufHijaiyah: "م" },
    { id: 115, arab: "دَورة", transliterasi: "Dawrah", indo: "Siklus", inggris: "Cycle", definisi: "Periode ulang atau putaran suatu fenomena langit.", link: "https://id.wikipedia.org/wiki/Siklus", huruf: "S", hurufHijaiyah: "د" },
    { id: 116, arab: "الدور القمري", transliterasi: "ad-Dawr al-Qamarī", indo: "Siklus Bulan", inggris: "Cycle Lunar", definisi: "Siklus peredaran Bulan sekitar 29,5 hari.", link: "https://id.wikipedia.org/wiki/Bulan_sinodis", huruf: "S", hurufHijaiyah: "د" },
    { id: 117, arab: "الدور الشمسي", transliterasi: "ad-Dawr ash-Shamsī", indo: "Siklus Matahari", inggris: "Cycle Solar", definisi: "Siklus aktivitas Matahari sekitar 11 tahun.", link: "https://id.wikipedia.org/wiki/Siklus_matahari", huruf: "S", hurufHijaiyah: "د" },
    { id: 118, arab: "الدَّجاجة", transliterasi: "ad-Dajājah", indo: "Rasi Cygnus", inggris: "Cygnus", definisi: "Rasi angsa utara yang berisi bintang Deneb.", link: "https://id.wikipedia.org/wiki/Cygnus_(rasi_bintang)", huruf: "R", hurufHijaiyah: "د" },

// Entri Huruf D
    { id: 119, arab: "الطاقة المظلمة", transliterasi: "aṭ-Ṭāqah al-Muẓlimah", indo: "Energi Gelap", inggris: "Dark Energy", definisi: "Energi misterius penyebab percepatan ekspansi alam semesta.", link: "https://id.wikipedia.org/wiki/Energi_gelap", huruf: "E", hurufHijaiyah: "ط" },
    { id: 120, arab: "المادة المظلمة", transliterasi: "al-Māddah al-Muẓlimah", indo: "Materi Gelap", inggris: "Dark Matter", definisi: "Materi tak terlihat yang membentuk sebagian besar massa alam semesta.", link: "https://id.wikipedia.org/wiki/Materi_gelap", huruf: "M", hurufHijaiyah: "م" },
    { id: 121, arab: "السديم المظلم", transliterasi: "as-Sadīm al-Muẓlim", indo: "Nebula Gelap", inggris: "Dark Nebula", definisi: "Awan debu dan gas antarbintang yang menghalangi cahaya bintang.", link: "https://id.wikipedia.org/wiki/Nebula_gelap", huruf: "N", hurufHijaiyah: "س" },
    { id: 122, arab: "النجوم المظلمة", transliterasi: "an-Nujūm al-Muẓlimah", indo: "Bintang Gelap", inggris: "Dark Stars", definisi: "Hipotesis bintang yang didinginkan oleh materi gelap di alam semesta awal.", link: "https://en.wikipedia.org/wiki/Dark_star_(dark_matter)", huruf: "B", hurufHijaiyah: "ن" },
    { id: 123, arab: "اليوم", transliterasi: "al-Yawm", indo: "Hari", inggris: "Day", definisi: "Periode waktu satu putaran Bumi pada sumbunya.", link: "https://id.wikipedia.org/wiki/Hari", huruf: "H", hurufHijaiyah: "ي" },
    { id: 124, arab: "الميل", transliterasi: "al-Mīl", indo: "Deklinasi", inggris: "Declination", definisi: "Jarak sudut benda langit dari ekuator langit.", link: "https://id.wikipedia.org/wiki/Deklinasi", huruf: "D", hurufHijaiyah: "م" },
    { id: 125, arab: "حامل", transliterasi: "Ḥāmil", indo: "Deferen", inggris: "Deferent", definisi: "Lingkaran imajiner tempat pusat episiklus bergerak.", link: "https://id.wikipedia.org/wiki/Deferen", huruf: "D", hurufHijaiyah: "ح" },
    { id: 126, arab: "درجة", transliterasi: "Darajah", indo: "Derajat", inggris: "Degree", definisi: "Satuan sudut sebesar 1/360 lingkaran penuh.", link: "https://id.wikipedia.org/wiki/Derajat_(sudut)", huruf: "D", hurufHijaiyah: "د" },
    { id: 127, arab: "الدُّلفين", transliterasi: "ad-Dulfīn", indo: "Delphinus", inggris: "Delphinus", definisi: "Rasi bintang kecil di utara yang berbentuk lumba-lumba.", link: "https://id.wikipedia.org/wiki/Delphinus", huruf: "D", hurufHijaiyah: "د" },
    { id: 128, arab: "كثافة", transliterasi: "Kathāfah", indo: "Densitas", inggris: "Density", definisi: "Massa per satuan volume suatu benda langit.", link: "https://id.wikipedia.org/wiki/Densitas", huruf: "D", hurufHijaiyah: "ك" },
    { id: 129, arab: "العقدة النازلة", transliterasi: "al-ʿUqdah an-Nāzilah", indo: "Node Turun", inggris: "Descending Node", definisi: "Titik orbit benda langit saat melintasi ekliptika ke selatan.", link: "https://id.wikipedia.org/wiki/Node_(astronomi)#Node_turun_dan_node_naik", huruf: "N", hurufHijaiyah: "ع" },
    { id: 130, arab: "الهبوط", transliterasi: "al-Hubūṭ", indo: "Penurunan", inggris: "Descention", definisi: "Penurunan atau penurunan posisi benda langit.", link: "https://id.wikipedia.org/wiki/Deklinasi", huruf: "P", hurufHijaiyah: "ه" },
    { id: 131, arab: "زيغان", transliterasi: "Zayghān", indo: "Deviasi", inggris: "Deviation", definisi: "Penyimpangan dari jalur orbit atau posisi standar.", link: "https://en.wikipedia.org/wiki/Orbital_perturbation", huruf: "D", hurufHijaiyah: "ز" },
    { id: 132, arab: "قطر", transliterasi: "Qaṭr", indo: "Diameter", inggris: "Diameter", definisi: "Garis lurus yang menghubungkan dua titik pada lingkaran.", link: "https://id.wikipedia.org/wiki/Diameter", huruf: "D", hurufHijaiyah: "ق" },
    { id: 133, arab: "فضلة", transliterasi: "Faḍlah", indo: "Selisih", inggris: "Difference", definisi: "Perbedaan nilai antara dua pengukuran astronomi.", link: "https://en.wikipedia.org/wiki/Difference", huruf: "S", hurufHijaiyah: "ف" },
    { id: 134, arab: "انحراف النور", transliterasi: "Inḥirāf an-Nūr", indo: "Difraksi", inggris: "Diffraction", definisi: "Pembelokan cahaya saat melewati celah atau tepi objek.", link: "https://id.wikipedia.org/wiki/Difraksi", huruf: "D", hurufHijaiyah: "ا" },
    { id: 135, arab: "انخفاض", transliterasi: "Inkhifāḍ", indo: "Kemiringan", inggris: "Dip", definisi: "Sudut kemiringan horizon atau medan magnet Bumi.", link: "https://id.wikipedia.org/wiki/Inklinasi", huruf: "K", hurufHijaiyah: "ا" },
    { id: 136, arab: "استقامة السيارات", transliterasi: "Istiqāmah as-Sayyārāt", indo: "Gerak Langsung", inggris: "Direct Motion", definisi: "Gerak planet dari barat ke timur relatif terhadap bintang.", link: "https://id.wikipedia.org/wiki/Gerak_prograde", huruf: "G", hurufHijaiyah: "ا" },
    { id: 137, arab: "قُرْص", transliterasi: "Qurṣ", indo: "Piringan", inggris: "Disc", definisi: "Bentuk piringan atau cakram benda langit seperti Matahari.", link: "https://id.wikipedia.org/wiki/Piringan_akresi", huruf: "P", hurufHijaiyah: "ق" },
    { id: 138, arab: "ازاحة", transliterasi: "Izāḥah", indo: "Perpindahan", inggris: "Displacement", definisi: "Perubahan posisi benda langit dari titik acuan.", link: "https://id.wikipedia.org/wiki/Perpindahan", huruf: "P", hurufHijaiyah: "ا" },
    { id: 139, arab: "يومي", transliterasi: "Yawmī", indo: "Harian", inggris: "Diurnal", definisi: "Peristiwa atau siklus yang terjadi setiap hari.", link: "https://id.wikipedia.org/wiki/Gerak_harian", huruf: "H", hurufHijaiyah: "ي" },
    { id: 140, arab: "الشِعرى", transliterasi: "ash-Shiʿrā", indo: "Bintang Anjing", inggris: "Dog star", definisi: "Sirius, bintang tercerah di langit malam.", link: "https://id.wikipedia.org/wiki/Sirius", huruf: "B", hurufHijaiyah: "ش" },
    { id: 141, arab: "أبو سيف", transliterasi: "Abū Sayf", indo: "Dorado", inggris: "Dorado", definisi: "Rasi bintang di selatan yang berbentuk ikan pedang.", link: "https://id.wikipedia.org/wiki/Dorado", huruf: "D", hurufHijaiyah: "ا" },
    { id: 142, arab: "نجوم مزدوجة", transliterasi: "Nujūm Muzdawijah", indo: "Bintang Ganda", inggris: "Double stars", definisi: "Pasangan bintang yang tampak berdekatan dari Bumi.", link: "https://id.wikipedia.org/wiki/Bintang_ganda", huruf: "B", hurufHijaiyah: "ن" },
    { id: 143, arab: "التنِّين", transliterasi: "at-Tinnīn", indo: "Naga", inggris: "Draco", definisi: "Rasi bintang di utara yang berbentuk naga.", link: "https://id.wikipedia.org/wiki/Draco_(rasi_bintang)", huruf: "N", hurufHijaiyah: "ت" },
    { id: 144, arab: "المجرة القزمة", transliterasi: "al-Majarrah al-Qazmah", indo: "Galaksi Kerdil", inggris: "Dwarf Galaxy", definisi: "Galaksi kecil dengan miliaran bintang dan massa rendah.", link: "https://id.wikipedia.org/wiki/Galaksi_kerdil", huruf: "G", hurufHijaiyah: "م" },
    { id: 145, arab: "الكوكب القزم", transliterasi: "al-Kawkab al-Qazam", indo: "Planet Kerdil", inggris: "Dwarf Planet", definisi: "Benda langit yang mengorbit Matahari namun belum membersihkan orbitnya.", link: "https://id.wikipedia.org/wiki/Planet_kerdil", huruf: "P", hurufHijaiyah: "ك" },

// Entri Huruf E
    { id: 146, arab: "الأرض", transliterasi: "ar-Raḍ", indo: "Bumi", inggris: "Earth", definisi: "Planet ketiga dari Matahari, tempat tinggal manusia.", link: "https://id.wikipedia.org/wiki/Bumi", huruf: "B", hurufHijaiyah: "ا" },
    { id: 147, arab: "دوران الأرض", transliterasi: "Dawrān ar-Raḍ", indo: "Rotasi Bumi", inggris: "Earth's Rotation", definisi: "Perputaran Bumi pada sumbunya selama 24 jam.", link: "https://id.wikipedia.org/wiki/Rotasi_Bumi", huruf: "R", hurufHijaiyah: "د" },
    { id: 148, arab: "الشرق", transliterasi: "ash-Sharq", indo: "Timur", inggris: "East", definisi: "Arah terbitnya Matahari, salah satu titik mata angin.", link: "https://id.wikipedia.org/wiki/Timur", huruf: "T", hurufHijaiyah: "ش" },
    { id: 149, arab: "الخافقان", transliterasi: "al-Khāfiqān", indo: "Timur & Barat", inggris: "East & West", definisi: "Dua arah mata angin yaitu timur dan barat.", link: "https://id.wikipedia.org/wiki/Mata_angin", huruf: "T", hurufHijaiyah: "خ" },
    { id: 150, arab: "الجزر", transliterasi: "al-Jazr", indo: "Pasang Surut", inggris: "Ebb", definisi: "Fenomena naik turunnya permukaan air laut akibat gravitasi Bulan.", link: "https://id.wikipedia.org/wiki/Pasang_surut", huruf: "P", hurufHijaiyah: "ج" },
    { id: 151, arab: "مباينة", transliterasi: "Mubāyanah", indo: "Eksentrisitas", inggris: "Eccentricity", definisi: "Tingkat keovalan orbit suatu benda langit.", link: "https://id.wikipedia.org/wiki/Eksentrisitas_(orbit)", huruf: "E", hurufHijaiyah: "م" },
    { id: 152, arab: "كسوف", transliterasi: "Kusūf", indo: "Gerhana Matahari", inggris: "Solar Eclipse (Sun)", definisi: "Terhalangnya cahaya Matahari oleh Bulan.", link: "https://id.wikipedia.org/wiki/Gerhana_matahari", huruf: "G", hurufHijaiyah: "ك" },
    { id: 153, arab: "خسوف", transliterasi: "Khusūf", indo: "Gerhana Bulan", inggris: "Lunar Eclipse (Moon)", definisi: "Terhalangnya cahaya Bulan oleh bayangan Bumi.", link: "https://id.wikipedia.org/wiki/Gerhana_bulan", huruf: "G", hurufHijaiyah: "خ" },
    { id: 154, arab: "فلك البروج", transliterasi: "Falak al-Burūj", indo: "Ekliptika", inggris: "Ecliptic", definisi: "Lintasan semu Matahari di langit selama setahun.", link: "https://id.wikipedia.org/wiki/Ekliptika", huruf: "E", hurufHijaiyah: "ف" },
    { id: 155, arab: "كُهَيْرِب", transliterasi: "Kuhayrib", indo: "Elektron", inggris: "Electron", definisi: "Partikel subatom bermuatan negatif.", link: "https://id.wikipedia.org/wiki/Elektron", huruf: "E", hurufHijaiyah: "ك" },
    { id: 156, arab: "عناصر", transliterasi: "ʿAnāṣir", indo: "Elemen", inggris: "Elements", definisi: "Zat dasar penyusun materi di alam semesta.", link: "https://id.wikipedia.org/wiki/Unsur_kimia", huruf: "E", hurufHijaiyah: "ع" },
    { id: 157, arab: "ارتفاع", transliterasi: "Irtifāʿ", indo: "Elevasi", inggris: "Elevation", definisi: "Sudut ketinggian benda langit di atas cakrawala.", link: "https://id.wikipedia.org/wiki/Sudut_elevasi", huruf: "E", hurufHijaiyah: "ا" },
    { id: 158, arab: "إهْلَيلَجِي", transliterasi: "Ihlīlajī", indo: "Elips", inggris: "Ellipse or Elliptic", definisi: "Bentuk geometri lintasan orbit planet berbentuk lonjong.", link: "https://id.wikipedia.org/wiki/Elips", huruf: "E", hurufHijaiyah: "ا" },
    { id: 159, arab: "الثور", transliterasi: "ath-Thawr", indo: "Rasi Taurus", inggris: "El Taur", definisi: "Rasi bintang zodiak yang berbentuk banteng.", link: "https://id.wikipedia.org/wiki/Taurus_(rasi_bintang)", huruf: "R", hurufHijaiyah: "ث" },
    { id: 160, arab: "انجلاء", transliterasi: "Injilā'", indo: "Emerasi", inggris: "Emersion", definisi: "Kemunculan kembali benda langit setelah terokultasi.", link: "https://id.wikipedia.org/wiki/Emersi", huruf: "E", hurufHijaiyah: "ا" },
    { id: 161, arab: "طاقة", transliterasi: "Ṭāqah", indo: "Energi", inggris: "Energy", definisi: "Kemampuan untuk melakukan kerja atau menghasilkan perubahan.", link: "https://id.wikipedia.org/wiki/Energi", huruf: "E", hurufHijaiyah: "ط" },
    { id: 162, arab: "غشاء", transliterasi: "Ghishā'", indo: "Selubung", inggris: "Envelope", definisi: "Lapisan atau selubung yang mengelilingi benda langit.", link: "https://en.wikipedia.org/wiki/Stellar_envelope", huruf: "S", hurufHijaiyah: "غ" },
    { id: 163, arab: "الانافة", transliterasi: "al-Anāfah", indo: "Epak", inggris: "Epact", definisi: "Selisih hari antara tahun Matahari dan tahun Bulan.", link: "https://id.wikipedia.org/wiki/Epak", huruf: "E", hurufHijaiyah: "ا" },
    { id: 164, arab: "فلك التدوير", transliterasi: "Falak at-Tadwīr", indo: "Episiklus", inggris: "Epicycle", definisi: "Lingkaran kecil pada teori Ptolemeus untuk gerak planet.", link: "https://id.wikipedia.org/wiki/Episiklus", huruf: "E", hurufHijaiyah: "ف" },
    { id: 165, arab: "مبدأ التاريخ", transliterasi: "Mabda' at-Tārīkh", indo: "Era", inggris: "Epoch", definisi: "Titik awal atau mula suatu periode waktu dalam astronomi.", link: "https://en.wikipedia.org/wiki/Epoch_(astronomy)", huruf: "E", hurufHijaiyah: "م" },
    { id: 166, arab: "معادلة", transliterasi: "Muʿādalah", indo: "Persamaan", inggris: "Equation", definisi: "Rumus matematis yang menghubungkan variabel-variabel astronomi.", link: "https://id.wikipedia.org/wiki/Persamaan", huruf: "P", hurufHijaiyah: "م" },
    { id: 167, arab: "معادلة الوقت", transliterasi: "Muʿādalah al-Waqt", indo: "Persamaan Waktu", inggris: "Equation of time", definisi: "Selisih antara waktu matahari sejati dan rata-rata.", link: "https://id.wikipedia.org/wiki/Persamaan_waktu", huruf: "P", hurufHijaiyah: "م" },
    { id: 168, arab: "خط الاستواء", transliterasi: "Khaṭṭ al-Istiwā'", indo: "Ekuator", inggris: "Equator", definisi: "Garis imajiner yang membagi Bumi menjadi belahan utara dan selatan.", link: "https://id.wikipedia.org/wiki/Ekuator", huruf: "E", hurufHijaiyah: "خ" },
    { id: 169, arab: "مرقب", transliterasi: "Marqab", indo: "Ekuatorial", inggris: "Equatorial", definisi: "Alat atau sistem yang berhubungan dengan ekuator langit.", link: "https://id.wikipedia.org/wiki/Teleskop_ekuatorial", huruf: "E", hurufHijaiyah: "م" },
    { id: 170, arab: "اعتدالي", transliterasi: "Iʿtidālī", indo: "Ekuinoksial", inggris: "Equinoctial", definisi: "Berhubungan dengan ekuinoks atau titik seimbang siang-malam.", link: "https://id.wikipedia.org/wiki/Ekuinoks", huruf: "E", hurufHijaiyah: "ا" },
    { id: 171, arab: "الاعتدالان", transliterasi: "al-Iʿtidālān", indo: "Ekuinoks", inggris: "Equinoxes", definisi: "Dua titik saat panjang siang dan malam sama.", link: "https://id.wikipedia.org/wiki/Ekuinoks", huruf: "E", hurufHijaiyah: "ا" },
    { id: 172, arab: "التاريخ", transliterasi: "at-Tārīkh", indo: "Zaman", inggris: "Era", definisi: "Periode waktu panjang dalam sejarah alam semesta.", link: "https://id.wikipedia.org/wiki/Zaman", huruf: "Z", hurufHijaiyah: "ت" },
    { id: 173, arab: "النهر", transliterasi: "an-Nahr", indo: "Rasi Eridanus", inggris: "Eridanus", definisi: "Rasi bintang panjang di selatan yang berbentuk sungai.", link: "https://id.wikipedia.org/wiki/Eridanus_(rasi_bintang)", huruf: "R", hurufHijaiyah: "ن" },
    { id: 174, arab: "ثوراني", transliterasi: "Thawrānī", indo: "Eruptif", inggris: "Eruptive", definisi: "Berkaitan dengan ledakan atau letusan di permukaan bintang.", link: "https://en.wikipedia.org/wiki/Eruptive_star", huruf: "E", hurufHijaiyah: "ث" },
    { id: 175, arab: "الأثير", transliterasi: "al-Athīr", indo: "Eter", inggris: "Ether", definisi: "Media hipotetis perambatan cahaya di masa lalu.", link: "https://id.wikipedia.org/wiki/Eter_(fisika)", huruf: "E", hurufHijaiyah: "أ" },
    { id: 176, arab: "الكوكب الخارجي", transliterasi: "al-Kawkab al-Khārijī", indo: "Eksoplanet", inggris: "Exoplanet", definisi: "Planet yang mengorbit bintang di luar tata surya.", link: "https://id.wikipedia.org/wiki/Eksoplanet", huruf: "E", hurufHijaiyah: "ك" },
    { id: 177, arab: "تمدد الكون", transliterasi: "Tamaddud al-Kawn", indo: "Ekspansi Alam Semesta", inggris: "Expanding universe", definisi: "Pengembangan alam semesta sejak peristiwa Big Bang.", link: "https://id.wikipedia.org/wiki/Ekspansi_alam_semesta", huruf: "E", hurufHijaiyah: "ت" },
    { id: 178, arab: "السيارات الخارجية", transliterasi: "as-Sayyārāt al-Khārijīyah", indo: "Planet Luar", inggris: "Exterior planets", definisi: "Planet yang orbitnya berada di luar orbit Bumi.", link: "https://id.wikipedia.org/wiki/Planet_luar", huruf: "P", hurufHijaiyah: "س" },
    { id: 179, arab: "النشوء والارتقاء", transliterasi: "an-Nushū' wa al-Irtiqā'", indo: "Evolusi", inggris: "Evolution", definisi: "Perubahan bertahap benda langit atau alam semesta.", link: "https://id.wikipedia.org/wiki/Evolusi", huruf: "E", hurufHijaiyah: "ن" },
    { id: 180, arab: "عينية المرقب", transliterasi: "ʿAynīyah al-Marqab", indo: "Lensa Mata", inggris: "Eyepiece", definisi: "Lensa okuler pada teleskop untuk melihat objek.", link: "https://id.wikipedia.org/wiki/Lensa_okuler", huruf: "L", hurufHijaiyah: "ع" },

// Entri Huruf F
    { id: 181, arab: "فلك البروج", transliterasi: "Falak al-Burūj", indo: "Zodiak", inggris: "Falak (The Zodiac)", definisi: "Lintasan semu Matahari di antara rasi bintang.", link: "https://id.wikipedia.org/wiki/Zodiak", huruf: "Z", hurufHijaiyah: "ف" },
    { id: 182, arab: "هلالي", transliterasi: "Hilālī", indo: "Berbentuk Sabit", inggris: "Falcated", definisi: "Berbentuk seperti bulan sabit.", link: "https://id.wikipedia.org/wiki/Sabit", huruf: "B", hurufHijaiyah: "ه" },
    { id: 183, arab: "الفارطان", transliterasi: "al-Fāriṭān", indo: "Faritan", inggris: "Faritan", definisi: "Nama bintang atau asterisme dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Gamma_Arietis", huruf: "F", hurufHijaiyah: "ف" },
    { id: 184, arab: "زحلة", transliterasi: "Zaḥlah", indo: "Zahle", inggris: "Fault (s)", definisi: "Nama bintang dalam rasi tertentu (dalam glosarium Arab).", link: "https://en.wikipedia.org/wiki/Beta_Librae", huruf: "Z", hurufHijaiyah: "ز" },
    { id: 185, arab: "الفوارس", transliterasi: "al-Fawāris", indo: "Fawaris", inggris: "Fawaris", definisi: "Kelompok bintang atau asterisme dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Zeta_Pegasi", huruf: "F", hurufHijaiyah: "ف" },
    { id: 186, arab: "فرساوس", transliterasi: "Farsāwus", indo: "Perseus", inggris: "Fersaus", definisi: "Rasi bintang Perseus di langit utara.", link: "https://id.wikipedia.org/wiki/Perseus_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ف" },
    { id: 187, arab: "مجال البصر", transliterasi: "Majāl al-Baṣar", indo: "Medan Pandang", inggris: "Field of view", definisi: "Area yang terlihat melalui teleskop atau instrumen optik.", link: "https://id.wikipedia.org/wiki/Medan_pandang", huruf: "M", hurufHijaiyah: "م" },
    { id: 188, arab: "خيطي", transliterasi: "Khayṭī", indo: "Berbenang", inggris: "Filar", definisi: "Berkaitan dengan benang atau serat (misal pada mikrometer).", link: "https://en.wikipedia.org/wiki/Filar_micrometer", huruf: "B", hurufHijaiyah: "خ" },
    { id: 189, arab: "السموات", transliterasi: "as-Samāwāt", indo: "Cakrawala", inggris: "Firmament", definisi: "Langit atau cakrawala sebagai atap alam semesta.", link: "https://id.wikipedia.org/wiki/Cakrawala", huruf: "C", hurufHijaiyah: "س" },
    { id: 190, arab: "طوفان", transliterasi: "Ṭūfān", indo: "Banjir", inggris: "Flood", definisi: "Banjir besar dalam mitologi dan astronomi kuno.", link: "https://id.wikipedia.org/wiki/Banjir", huruf: "B", hurufHijaiyah: "ط" },
    { id: 191, arab: "التألق", transliterasi: "at-Ta'luq", indo: "Fluoresensi", inggris: "Fluorescence", definisi: "Pemancaran cahaya oleh zat setelah menyerap radiasi.", link: "https://id.wikipedia.org/wiki/Fluoresensi", huruf: "F", hurufHijaiyah: "ت" },
    { id: 192, arab: "الضوء المتألق", transliterasi: "aḍ-Ḍaw' al-Muta'alliq", indo: "Cahaya Fluoresen", inggris: "Fluorescent", definisi: "Cahaya yang dipancarkan oleh zat berpendar.", link: "https://id.wikipedia.org/wiki/Fluoresensi", huruf: "C", hurufHijaiyah: "ض" },
    { id: 193, arab: "الفَكَّة", transliterasi: "al-Fakkah", indo: "Foka", inggris: "Foca", definisi: "Nama bintang atau asterisme dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Alpha_Coronae_Borealis", huruf: "F", hurufHijaiyah: "ف" },
    { id: 194, arab: "بؤرة", transliterasi: "Bu'rah", indo: "Fokus", inggris: "Focus", definisi: "Titik pertemuan sinar cahaya pada lensa atau cermin.", link: "https://id.wikipedia.org/wiki/Titik_fokus", huruf: "F", hurufHijaiyah: "ب" },
    { id: 195, arab: "قوة", transliterasi: "Quwwah", indo: "Gaya", inggris: "Force", definisi: "Dorongan atau tarikan yang mengubah gerak benda.", link: "https://id.wikipedia.org/wiki/Gaya_(fisika)", huruf: "G", hurufHijaiyah: "ق" },
    { id: 196, arab: "الكور الكيماوي", transliterasi: "al-Kūr al-Kīmāwī", indo: "Fornax", inggris: "Fornax", definisi: "Rasi bintang Fornax (Tungku) di langit selatan.", link: "https://id.wikipedia.org/wiki/Fornax_(rasi_bintang)", huruf: "F", hurufHijaiyah: "ك" },
    { id: 197, arab: "البدر", transliterasi: "al-Badr", indo: "Bulan Purnama", inggris: "Full Moon", definisi: "Fase saat Bulan tampak bulat penuh dari Bumi.", link: "https://id.wikipedia.org/wiki/Bulan_purnama", huruf: "B", hurufHijaiyah: "ب" },

// Entri Huruf G
    { id: 198, arab: "جبَّار", transliterasi: "Jabbār", indo: "Jabbar (Raksasa)", inggris: "Gabbar", definisi: "Nama bintang raksasa dalam astronomi Arab (Betelgeuse).", link: "https://id.wikipedia.org/wiki/Betelgeuse", huruf: "J", hurufHijaiyah: "ج" },
    { id: 199, arab: "دائرة المجرَّة", transliterasi: "Dā'irat al-Majarrah", indo: "Lingkaran Galaksi", inggris: "Galactic Circle", definisi: "Lingkaran besar di langit sepanjang bidang galaksi.", link: "https://en.wikipedia.org/wiki/Galactic_coordinate_system", huruf: "L", hurufHijaiyah: "د" },
    { id: 200, arab: "المجرَّة", transliterasi: "al-Majarrah", indo: "Galaksi", inggris: "Galaxy", definisi: "Kumpulan miliaran bintang, gas, dan debu di alam semesta.", link: "https://id.wikipedia.org/wiki/Galaksi", huruf: "G", hurufHijaiyah: "م" },
    { id: 201, arab: "أشعة جاما", transliterasi: "Ashshi'at Ghāmā", indo: "Sinar Gamma", inggris: "Gamma Ray", definisi: "Radiasi elektromagnetik dengan energi tertinggi.", link: "https://id.wikipedia.org/wiki/Sinar_gamma", huruf: "S", hurufHijaiyah: "ا" },
    { id: 202, arab: "انفجار أشعة غاما", transliterasi: "Infijār Ashshi'at Ghāmā", indo: "Ledakan Sinar Gamma", inggris: "Gamma Ray Burst", definisi: "Ledakan energi sinar gamma paling dahsyat di alam semesta.", link: "https://id.wikipedia.org/wiki/Ledakan_sinar_gamma", huruf: "L", hurufHijaiyah: "ا" },
    { id: 203, arab: "الكرة الغازية المحيطة", transliterasi: "al-Kurah al-Ghāziyyah al-Muḥīṭah", indo: "Selubung Gas", inggris: "Gaseous envelope", definisi: "Lapisan gas yang menyelimuti bintang atau planet.", link: "https://en.wikipedia.org/wiki/Gaseous_envelope", huruf: "S", hurufHijaiyah: "ك" },
    { id: 204, arab: "مضاعفة", transliterasi: "Muḍā'afah", indo: "Penggandaan", inggris: "Gemination", definisi: "Pengulangan atau penggandaan fenomena langit.", link: "https://en.wikipedia.org/wiki/Gemination", huruf: "P", hurufHijaiyah: "م" },
    { id: 205, arab: "الجوزاء", transliterasi: "al-Jawzā'", indo: "Gemini", inggris: "Gemini, The Twins", definisi: "Rasi zodiak kembar yang berisi bintang Castor dan Pollux.", link: "https://id.wikipedia.org/wiki/Gemini_(rasi_bintang)", huruf: "G", hurufHijaiyah: "ج" },
    { id: 206, arab: "العرض المركزي", transliterasi: "al-ʿArḍ al-Markazī", indo: "Lintang Geosentris", inggris: "Geocentric latitude", definisi: "Sudut lintang suatu titik dilihat dari pusat Bumi.", link: "https://en.wikipedia.org/wiki/Geocentric_latitude", huruf: "L", hurufHijaiyah: "ع" },
    { id: 207, arab: "علم قياس الارض", transliterasi: "ʿIlm Qiyās al-Arḍ", indo: "Geodesi", inggris: "Geodesy", definisi: "Ilmu pengukuran dan pemetaan permukaan Bumi.", link: "https://id.wikipedia.org/wiki/Geodesi", huruf: "G", hurufHijaiyah: "ع" },
    { id: 208, arab: "العرض الجغرافي", transliterasi: "al-ʿArḍ al-Jughrāfī", indo: "Lintang Geografis", inggris: "Geographical latitude", definisi: "Jarak sudut suatu titik dari ekuator Bumi.", link: "https://id.wikipedia.org/wiki/Lintang_geografis", huruf: "L", hurufHijaiyah: "ع" },
    { id: 209, arab: "العاصفة الجيومغناطيسية", transliterasi: "al-ʿĀṣifah al-Jiyūmāghnāṭīsiyyah", indo: "Badai Geomagnetik", inggris: "Geomagnetic Storm", definisi: "Gangguan medan magnet Bumi akibat aktivitas Matahari.", link: "https://id.wikipedia.org/wiki/Badai_geomagnetik", huruf: "B", hurufHijaiyah: "ع" },
    { id: 210, arab: "علم الظل والمنظور", transliterasi: "ʿIlm aẓ-Ẓill wa al-Manẓūr", indo: "Geometri Proyektif", inggris: "Geometry, Projective", definisi: "Cabang geometri tentang proyeksi dan bayangan.", link: "https://id.wikipedia.org/wiki/Geometri_proyektif", huruf: "G", hurufHijaiyah: "ع" },
    { id: 211, arab: "الغَفر", transliterasi: "al-Ghafr", indo: "Ghafr", inggris: "Ghafr", definisi: "Nama bintang dalam astronomi Arab (di rasi tertentu).", link: "https://en.wikipedia.org/wiki/Zeta_Leonis", huruf: "G", hurufHijaiyah: "غ" },
    { id: 212, arab: "الكُرَة", transliterasi: "al-Kurah", indo: "Bola Langit", inggris: "Globe", definisi: "Bentuk bola atau bulatan, misalnya Bumi atau benda langit.", link: "https://id.wikipedia.org/wiki/Bola_langit", huruf: "B", hurufHijaiyah: "ك" },
    { id: 213, arab: "مِزولة", transliterasi: "Mizwalah", indo: "Jam Matahari", inggris: "Gnomon, Sun Dial", definisi: "Alat penunjuk waktu berdasarkan bayangan Matahari.", link: "https://id.wikipedia.org/wiki/Jam_matahari", huruf: "J", hurufHijaiyah: "م" },
    { id: 214, arab: "العدد الذهبي", transliterasi: "al-ʿAdad adh-Dhahabī", indo: "Angka Emas", inggris: "Golden number", definisi: "Rasio 1,618 dalam pola alami dan astronomi.", link: "https://id.wikipedia.org/wiki/Nisbah_emas", huruf: "A", hurufHijaiyah: "ع" },
    { id: 215, arab: "المحزّزة", transliterasi: "al-Muḥazzazah", indo: "Kisi Difraksi", inggris: "Grating", definisi: "Kisi optik untuk mengurai cahaya menjadi spektrum.", link: "https://id.wikipedia.org/wiki/Kisi_difraksi", huruf: "K", hurufHijaiyah: "م" },
    { id: 216, arab: "الجاذبية العامة", transliterasi: "al-Jādhībiyyah al-ʿĀmmah", indo: "Gravitasi Universal", inggris: "Gravitation", definisi: "Gaya tarik-menarik antara semua benda bermassa.", link: "https://id.wikipedia.org/wiki/Gravitasi_universal", huruf: "G", hurufHijaiyah: "ج" },
    { id: 217, arab: "موجات الجاذبية", transliterasi: "Mawjāt al-Jādhībiyyah", indo: "Gelombang Gravitasi", inggris: "Gravitational Waves", definisi: "Gelombang ruang-waktu akibat percepatan massa masif.", link: "https://id.wikipedia.org/wiki/Gelombang_gravitasi", huruf: "G", hurufHijaiyah: "م" },
    { id: 218, arab: "الجاذبية", transliterasi: "al-Jādhībiyyah", indo: "Gravitasi", inggris: "Gravity", definisi: "Gaya tarik benda bermassa yang membentuk orbit.", link: "https://id.wikipedia.org/wiki/Gravitasi", huruf: "G", hurufHijaiyah: "ج" },
    { id: 219, arab: "الدائرة العظيمة", transliterasi: "ad-Dā'irah al-ʿAẓīmah", indo: "Lingkaran Besar", inggris: "Great circle", definisi: "Lingkaran di permukaan bola dengan jari-jari maksimum.", link: "https://id.wikipedia.org/wiki/Lingkaran_besar", huruf: "L", hurufHijaiyah: "د" },
    { id: 220, arab: "الكُرْكِي", transliterasi: "al-Kurkī", indo: "Grus", inggris: "Grus", definisi: "Rasi bintang bangau di langit selatan.", link: "https://id.wikipedia.org/wiki/Grus_(rasi_bintang)", huruf: "G", hurufHijaiyah: "ك" },
    { id: 221, arab: "الجيروسكوب", transliterasi: "al-Jīrūskūb", indo: "Giroskop", inggris: "Gyroscope", definisi: "Alat untuk mengukur orientasi dan stabilitas pesawat ruang angkasa.", link: "https://id.wikipedia.org/wiki/Giroskop", huruf: "G", hurufHijaiyah: "ج" },

// Entri Huruf H
    { id: 222, arab: "الهالة", transliterasi: "al-Hālah", indo: "Halo", inggris: "Halo", definisi: "Lingkaran cahaya di sekitar Matahari atau Bulan.", link: "https://id.wikipedia.org/wiki/Halo_(fenomena_optik)", huruf: "H", hurufHijaiyah: "ه" },
    { id: 223, arab: "الحَمَل", transliterasi: "al-Ḥamal", indo: "Hamal", inggris: "Hamal", definisi: "Bintang tercerah di rasi Aries.", link: "https://id.wikipedia.org/wiki/Hamal", huruf: "H", hurufHijaiyah: "ح" },
    { id: 224, arab: "الخَراثان", transliterasi: "al-Kharāṡān", indo: "Haratan", inggris: "Haratan", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Gamma_Arietis", huruf: "H", hurufHijaiyah: "خ" },
    { id: 225, arab: "الخَرَزات", transliterasi: "al-Kharazāt", indo: "Harazah", inggris: "Harazah", definisi: "Asterisme atau bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/35_Arietis", huruf: "H", hurufHijaiyah: "خ" },
    { id: 226, arab: "حارس السماء", transliterasi: "Ḥāris as-Samā'", indo: "Haris as-Sama", inggris: "Haris al Sama'", definisi: "Bintang penjaga langit dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Haris_al-sama%27", huruf: "H", hurufHijaiyah: "ح" },
    { id: 227, arab: "قانون التناسق", transliterasi: "Qānūn at-Tanāsuq", indo: "Hukum Harmonis", inggris: "Harmonic law", definisi: "Hukum perbandingan perioda orbit planet (Hukum Kepler III).", link: "https://id.wikipedia.org/wiki/Hukum_Kepler", huruf: "H", hurufHijaiyah: "ق" },
    { id: 228, arab: "السلسلة المتصلة الموسيقية", transliterasi: "as-Silsilah al-Muttaṣilah al-Mūsīqiyyah", indo: "Deret Harmonis", inggris: "Harmonic Progression", definisi: "Deret bilangan dengan perbandingan harmonis.", link: "https://en.wikipedia.org/wiki/Harmonic_progression_(mathematics)", huruf: "D", hurufHijaiyah: "س" },
    { id: 229, arab: "السماء", transliterasi: "as-Samā'", indo: "Langit", inggris: "Heaven", definisi: "Cakrawala atau angkasa luas di atas Bumi.", link: "https://id.wikipedia.org/wiki/Langit", huruf: "L", hurufHijaiyah: "س" },
    { id: 230, arab: "الاجرام السماوية", transliterasi: "al-Ajrām as-Samāwiyyah", indo: "Benda Langit", inggris: "Heavenly bodies", definisi: "Semua objek yang berada di luar angkasa.", link: "https://id.wikipedia.org/wiki/Benda_langit", huruf: "B", hurufHijaiyah: "ا" },
    { id: 231, arab: "الهَـقْعَة", transliterasi: "al-Haq'ah", indo: "Heka", inggris: "Heka & Hika", definisi: "Asterisme dalam rasi bintang tertentu.", link: "https://en.wikipedia.org/wiki/Zeta_Ophiuchi", huruf: "H", hurufHijaiyah: "ه" },
    { id: 232, arab: "متصل بالشمس وقريب منها", transliterasi: "Muttaṣil bi ash-Shams wa qarīb minhā", indo: "Heliak", inggris: "Heliacal", definisi: "Berhubungan dengan terbit atau terbenamnya bintang bersama Matahari.", link: "https://en.wikipedia.org/wiki/Heliacal_rising", huruf: "H", hurufHijaiyah: "م" },
    { id: 233, arab: "مختص مركز الشمس", transliterasi: "Mukhtaṣṣ Markaz ash-Shams", indo: "Heliosentris", inggris: "Heliocentric", definisi: "Model tata surya dengan Matahari sebagai pusat.", link: "https://id.wikipedia.org/wiki/Heliosentrisme", huruf: "H", hurufHijaiyah: "م" },
    { id: 234, arab: "الهليومتر", transliterasi: "al-Hīlīyūmitr", indo: "Heliometer", inggris: "Heliometer", definisi: "Instrumen untuk mengukur diameter sudut Matahari.", link: "https://en.wikipedia.org/wiki/Heliometer", huruf: "H", hurufHijaiyah: "ه" },
    { id: 235, arab: "الهليوسكوب", transliterasi: "al-Hīlīyūskūb", indo: "Helioskop", inggris: "Helioscope", definisi: "Teleskop untuk mengamati permukaan Matahari.", link: "https://en.wikipedia.org/wiki/Helioscope", huruf: "H", hurufHijaiyah: "ه" },
    { id: 236, arab: "هليوستات", transliterasi: "Hīlīyūstāt", indo: "Heliostat", inggris: "Heliostat", definisi: "Alat dengan cermin yang mengikuti pergerakan Matahari.", link: "https://id.wikipedia.org/wiki/Heliostat", huruf: "H", hurufHijaiyah: "ه" },
    { id: 237, arab: "الهيليوم", transliterasi: "al-Hīlīyūm", indo: "Helium", inggris: "Helium", definisi: "Gas mulia kedua terbanyak di alam semesta setelah hidrogen.", link: "https://id.wikipedia.org/wiki/Helium", huruf: "H", hurufHijaiyah: "ه" },
    { id: 238, arab: "هرقل", transliterasi: "Hiraql", indo: "Hercules", inggris: "Hercules", definisi: "Rasi bintang besar di langit utara.", link: "https://id.wikipedia.org/wiki/Hercules_(rasi_bintang)", huruf: "H", hurufHijaiyah: "ه" },
    { id: 239, arab: "أُفُق", transliterasi: "Ufuq", indo: "Horizon", inggris: "Horizon", definisi: "Garis batas antara langit dan permukaan Bumi.", link: "https://id.wikipedia.org/wiki/Horizon", huruf: "H", hurufHijaiyah: "ا" },
    { id: 240, arab: "الساعة", transliterasi: "as-Sā'ah", indo: "Jam", inggris: "Horlogium", definisi: "Rasi bintang Horologium (Jam) di langit selatan.", link: "https://id.wikipedia.org/wiki/Horologium_(rasi_bintang)", huruf: "J", hurufHijaiyah: "س" },
    { id: 241, arab: "زاوية سويعية", transliterasi: "Zāwiyah Sawī'iyyah", indo: "Sudut Jam", inggris: "Hour Angle", definisi: "Sudut waktu benda langit dari meridian lokal.", link: "https://id.wikipedia.org/wiki/Sudut_jam", huruf: "S", hurufHijaiyah: "ز" },
    { id: 242, arab: "دائرة سويعية", transliterasi: "Dā'irah Sawī'iyyah", indo: "Lingkaran Jam", inggris: "Hour Circle", definisi: "Lingkaran besar yang melalui kutub dan benda langit.", link: "https://en.wikipedia.org/wiki/Hour_circle", huruf: "L", hurufHijaiyah: "د" },
    { id: 243, arab: "الشجاع", transliterasi: "ash-Shujā'", indo: "Hydra", inggris: "Hydra", definisi: "Rasi bintang terbesar di langit.", link: "https://id.wikipedia.org/wiki/Hydra_(rasi_bintang)", huruf: "H", hurufHijaiyah: "ش" },
    { id: 244, arab: "حية الماء", transliterasi: "Ḥayyat al-Mā'", indo: "Hydrus", inggris: "Hydrus", definisi: "Rasi bintang ular air di langit selatan.", link: "https://id.wikipedia.org/wiki/Hydrus", huruf: "H", hurufHijaiyah: "ح" },
    { id: 245, arab: "قطع زائد", transliterasi: "Qaṭ' Zā'id", indo: "Hiperbola", inggris: "Hyperbola", definisi: "Kurva berbentuk orbit benda yang melesat dari tata surya.", link: "https://id.wikipedia.org/wiki/Hiperbola", huruf: "H", hurufHijaiyah: "ق" },
    { id: 246, arab: "هُذلولي", transliterasi: "Hużlūlī", indo: "Hiperbolik", inggris: "Hyperbolic", definisi: "Berkaitan dengan bentuk hiperbola atau lintasan eksentrik.", link: "https://id.wikipedia.org/wiki/Fungsi_hiperbolik", huruf: "H", hurufHijaiyah: "ه" },
    { id: 247, arab: "القطر", transliterasi: "al-Qaṭr", indo: "Hipotenusa", inggris: "Hypotenuse", definisi: "Sisi miring segitiga siku-siku dalam trigonometri langit.", link: "https://id.wikipedia.org/wiki/Sisi_miring", huruf: "H", hurufHijaiyah: "ق" },

// Entri Huruf I
    { id: 248, arab: "يد الجوزاء", transliterasi: "Yad al-Jawzā'", indo: "Yad al-Jawza", inggris: "Ied Algeuze", definisi: "Tangan rasi Gemini dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Delta_Ophiuchi", huruf: "Y", hurufHijaiyah: "ي" },
    { id: 249, arab: "تنویر", transliterasi: "Tanwīr", indo: "Iluminasi", inggris: "Illumination", definisi: "Pencahayaan permukaan benda langit oleh Matahari.", link: "https://id.wikipedia.org/wiki/Iluminasi", huruf: "I", hurufHijaiyah: "ت" },
    { id: 250, arab: "بد الظُلمة", transliterasi: "Bad aẓ-Ẓulmah", indo: "Imersi", inggris: "Immersion", definisi: "Saat benda langit terbenam atau memasuki bayangan.", link: "https://id.wikipedia.org/wiki/Gerhana", huruf: "I", hurufHijaiyah: "ب" },
    { id: 251, arab: "مَيْل الفلك", transliterasi: "Mayl al-Falak", indo: "Inklinasi Orbit", inggris: "Inclination of Orbit", definisi: "Sudut kemiringan orbit terhadap bidang ekliptika.", link: "https://id.wikipedia.org/wiki/Inklinasi", huruf: "I", hurufHijaiyah: "م" },
    { id: 252, arab: "مرآة الزند", transliterasi: "Mir'āh az-Zind", indo: "Cermin Indeks", inggris: "Index Mirror", definisi: "Cermin pada instrumen sextant untuk mengukur sudut.", link: "https://id.wikipedia.org/wiki/Sextant", huruf: "C", hurufHijaiyah: "م" },
    { id: 253, arab: "دور التصريح", transliterasi: "Dawr at-Taṣrīḥ", indo: "Indiksi", inggris: "Indiction", definisi: "Siklus 15 tahun dalam kalender Romawi kuno.", link: "https://id.wikipedia.org/wiki/Indiksi", huruf: "I", hurufHijaiyah: "د" },
    { id: 254, arab: "استقراء", transliterasi: "Istiqrā'", indo: "Induksi", inggris: "Induction", definisi: "Metode penalaran dari kasus khusus ke umum dalam sains.", link: "https://id.wikipedia.org/wiki/Induksi", huruf: "I", hurufHijaiyah: "ا" },
    { id: 255, arab: "قوة الاستمرار", transliterasi: "Quwwat al-Istimrār", indo: "Inersia", inggris: "Inertia", definisi: "Kecenderungan benda untuk mempertahankan keadaan geraknya.", link: "https://id.wikipedia.org/wiki/Inersia", huruf: "I", hurufHijaiyah: "ق" },
    { id: 256, arab: "السيارات السُفلى", transliterasi: "as-Sayyārāt as-Suflā", indo: "Planet Inferior", inggris: "Inferior Planets", definisi: "Planet dengan orbit di dalam orbit Bumi (Merkurius, Venus).", link: "https://id.wikipedia.org/wiki/Planet_inferior", huruf: "P", hurufHijaiyah: "س" },
    { id: 257, arab: "تلسكوب الأشعة تحت الحمراء", transliterasi: "Tiliskūb al-Ash'ah taḥt al-Ḥamrā'", indo: "Teleskop Inframerah", inggris: "Infrared Telescope", definisi: "Teleskop yang mendeteksi radiasi inframerah.", link: "https://id.wikipedia.org/wiki/Teleskop_inframerah", huruf: "T", hurufHijaiyah: "ت" },
    { id: 258, arab: "شِدَّة", transliterasi: "Shiddah", indo: "Intensitas", inggris: "Intensity", definisi: "Kekuatan radiasi atau fluks energi dari benda langit.", link: "https://id.wikipedia.org/wiki/Intensitas", huruf: "I", hurufHijaiyah: "ش" },
    { id: 259, arab: "الكَبْس", transliterasi: "al-Kabs", indo: "Interkalasi", inggris: "Intercalation", definisi: "Penyisipan hari atau bulan tambahan dalam kalender.", link: "https://id.wikipedia.org/wiki/Interkalasi", huruf: "I", hurufHijaiyah: "ك" },
    { id: 260, arab: "السيارات الداخلية", transliterasi: "as-Sayyārāt ad-Dākhiliyyah", indo: "Planet Interior", inggris: "Interior Planets", definisi: "Planet dengan orbit di dalam sabuk asteroid (Merkurius, Venus, Bumi, Mars).", link: "https://id.wikipedia.org/wiki/Planet_dalam", huruf: "P", hurufHijaiyah: "س" },
    { id: 261, arab: "الفضاء النجمي", transliterasi: "al-Faḍā' an-Najmī", indo: "Antarbintang", inggris: "Interstellar", definisi: "Ruang di antara bintang-bintang dalam galaksi.", link: "https://id.wikipedia.org/wiki/Ruang_antarbintang", huruf: "A", hurufHijaiyah: "ف" },
    { id: 262, arab: "آيو", transliterasi: "Āyū", indo: "Io", inggris: "Io", definisi: "Bulan vulkanik terbesar keempat Jupiter.", link: "https://id.wikipedia.org/wiki/Io_(bulan)", huruf: "I", hurufHijaiyah: "آ" },
    { id: 263, arab: "أيون", transliterasi: "Īyūn", indo: "Ion", inggris: "Ion", definisi: "Atom atau molekul bermuatan listrik di luar angkasa.", link: "https://id.wikipedia.org/wiki/Ion", huruf: "I", hurufHijaiyah: "ا" },
    { id: 264, arab: "يؤين", transliterasi: "Yu'ayyin", indo: "Ionisasi", inggris: "Ionize", definisi: "Proses mengubah atom menjadi ion dengan melepas atau menangkap elektron.", link: "https://id.wikipedia.org/wiki/Ionisasi", huruf: "I", hurufHijaiyah: "ي" },
    { id: 265, arab: "الإزار", transliterasi: "al-Izār", indo: "Izar", inggris: "Izar", definisi: "Bintang di rasi Boötes, juga disebut Pulcherrima.", link: "https://id.wikipedia.org/wiki/Izar", huruf: "I", hurufHijaiyah: "ا" },

// Entri Huruf J
    { id: 266, arab: "جناح الدجاجة", transliterasi: "Janāḥ ad-Dajājah", indo: "Janah", inggris: "Janah", definisi: "Bintang di rasi Cygnus (sayap ayam).", link: "https://en.wikipedia.org/wiki/Delta_Cygni", huruf: "J", hurufHijaiyah: "ج" },
    { id: 267, arab: "السنة الرومية", transliterasi: "as-Sanah ar-Rūmiyyah", indo: "Kalender Julian", inggris: "Julian calendar", definisi: "Kalender yang diperkenalkan Julius Caesar.", link: "https://id.wikipedia.org/wiki/Kalender_Julian", huruf: "K", hurufHijaiyah: "س" },
    { id: 268, arab: "يونون", transliterasi: "Yūnūn", indo: "Juno", inggris: "Juno", definisi: "Asteroid terbesar ke-3 di sabuk utama.", link: "https://id.wikipedia.org/wiki/3_Juno", huruf: "J", hurufHijaiyah: "ي" },
    { id: 269, arab: "المشتري", transliterasi: "al-Mushtarī", indo: "Jupiter", inggris: "Jupiter", definisi: "Planet terbesar di tata surya.", link: "https://id.wikipedia.org/wiki/Jupiter", huruf: "J", hurufHijaiyah: "م" },
    { id: 270, arab: "ذنب التنين", transliterasi: "Dhanab at-Tinnīn", indo: "Jusa/Juza", inggris: "Jusa, Juza", definisi: "Bintang di rasi Draco (ekor naga).", link: "https://en.wikipedia.org/wiki/Eltanin", huruf: "J", hurufHijaiyah: "ذ" },

// Entri Huruf K
    { id: 271, arab: "عِقدة الخيطين", transliterasi: "ʿIqdat al-Khayṭayn", indo: "Kaitain", inggris: "Kaitain", definisi: "Bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Kaitain_(star)", huruf: "K", hurufHijaiyah: "ع" },
    { id: 272, arab: "القوس", transliterasi: "al-Qaws", indo: "Kaus", inggris: "Kaus", definisi: "Bintang di rasi Sagittarius (busur).", link: "https://id.wikipedia.org/wiki/Kaus_Australis", huruf: "K", hurufHijaiyah: "ق" },
    { id: 273, arab: "القَيض", transliterasi: "al-Qayḍ", indo: "Keid", inggris: "Keid", definisi: "Bintang di rasi Eridanus.", link: "https://en.wikipedia.org/wiki/Keid", huruf: "K", hurufHijaiyah: "ق" },
    { id: 274, arab: "قطعة الفرس", transliterasi: "Qiṭ'at al-Faras", indo: "Kitalpha", inggris: "Kitalpha", definisi: "Bintang tercerah di rasi Equuleus.", link: "https://id.wikipedia.org/wiki/Kitalpha", huruf: "K", hurufHijaiyah: "ق" },
    { id: 275, arab: "القرود", transliterasi: "al-Qurūd", indo: "Kurud", inggris: "Kurud", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/List_of_Arabic_star_names", huruf: "K", hurufHijaiyah: "ق" },

// Entri Huruf L
    { id: 276, arab: "العَظاءة", transliterasi: "al-ʿAẓā'ah", indo: "Lacerta", inggris: "Lacerta", definisi: "Rasi bintang kecil di langit utara.", link: "https://id.wikipedia.org/wiki/Lacerta", huruf: "L", hurufHijaiyah: "ع" },
    { id: 277, arab: "العَرض", transliterasi: "al-ʿArḍ", indo: "Lintang", inggris: "Latitude", definisi: "Jarak sudut suatu titik dari ekuator.", link: "https://id.wikipedia.org/wiki/Lintang_geografis", huruf: "L", hurufHijaiyah: "ع" },
    { id: 278, arab: "سنة كبيسة", transliterasi: "Sanah Kabīsah", indo: "Tahun Kabisat", inggris: "Leap year", definisi: "Tahun yang memiliki 366 hari.", link: "https://id.wikipedia.org/wiki/Tahun_kabisat", huruf: "T", hurufHijaiyah: "س" },
    { id: 279, arab: "عَدَسة", transliterasi: "ʿAdasah", indo: "Lensa", inggris: "Lens", definisi: "Lensa optik untuk mengumpulkan cahaya.", link: "https://id.wikipedia.org/wiki/Lensa", huruf: "L", hurufHijaiyah: "ع" },
    { id: 280, arab: "الأسد", transliterasi: "al-Asad", indo: "Leo", inggris: "Leo", definisi: "Rasi zodiak kelima, berbentuk singa.", link: "https://id.wikipedia.org/wiki/Leo_(rasi_bintang)", huruf: "L", hurufHijaiyah: "ا" },
    { id: 281, arab: "الأرنب", transliterasi: "al-Arnab", indo: "Lepus", inggris: "Lepus", definisi: "Rasi kelinci di bawah rasi Orion.", link: "https://id.wikipedia.org/wiki/Lepus", huruf: "L", hurufHijaiyah: "ا" },
    { id: 282, arab: "الميزان", transliterasi: "al-Mīzān", indo: "Libra", inggris: "Libra", definisi: "Rasi zodiak ketujuh, berbentuk timbangan.", link: "https://id.wikipedia.org/wiki/Libra_(rasi_bintang)", huruf: "L", hurufHijaiyah: "م" },
    { id: 283, arab: "تمایل", transliterasi: "Tamāyul", indo: "Libasi", inggris: "Libration", definisi: "Goyangan Bulan yang memperlihatkan sisi belakang.", link: "https://id.wikipedia.org/wiki/Librasi", huruf: "L", hurufHijaiyah: "ت" },
    { id: 284, arab: "الضوء", transliterasi: "aḍ-Ḍaw'", indo: "Cahaya", inggris: "Light", definisi: "Radiasi elektromagnetik yang dapat dilihat mata.", link: "https://id.wikipedia.org/wiki/Cahaya", huruf: "C", hurufHijaiyah: "ض" },
    { id: 285, arab: "التلوث الضوئي", transliterasi: "at-Talawwuth aḍ-Ḍaw'ī", indo: "Polusi Cahaya", inggris: "Light Pollution", definisi: "Cahaya buatan yang mengganggu pengamatan langit.", link: "https://id.wikipedia.org/wiki/Polusi_cahaya", huruf: "P", hurufHijaiyah: "ت" },
    { id: 286, arab: "سنة ضوئية", transliterasi: "Sanah Ḍaw'iyyah", indo: "Tahun Cahaya", inggris: "Light Year", definisi: "Jarak tempuh cahaya dalam setahun.", link: "https://id.wikipedia.org/wiki/Tahun_cahaya", huruf: "T", hurufHijaiyah: "س" },
    { id: 287, arab: "حرف", transliterasi: "Ḥarf", indo: "Limbus", inggris: "Limb", definisi: "Tepi piringan benda langit (Matahari/Bulan).", link: "https://en.wikipedia.org/wiki/Limb_(astronomy)", huruf: "L", hurufHijaiyah: "ح" },
    { id: 288, arab: "حدود", transliterasi: "Ḥudūd", indo: "Batas", inggris: "Limits", definisi: "Batas ekstrem posisi benda langit.", link: "https://id.wikipedia.org/wiki/Orbit", huruf: "B", hurufHijaiyah: "ح" },
    { id: 289, arab: "وقت مكاني", transliterasi: "Waqt Makānī", indo: "Waktu Lokal", inggris: "Local time", definisi: "Waktu berdasarkan meridian suatu tempat.", link: "https://id.wikipedia.org/wiki/Waktu_lokal", huruf: "W", hurufHijaiyah: "و" },
    { id: 290, arab: "الطول", transliterasi: "aṭ-Ṭūl", indo: "Bujur", inggris: "Longitude", definisi: "Jarak sudut timur-barat dari meridian.", link: "https://id.wikipedia.org/wiki/Bujur", huruf: "B", hurufHijaiyah: "ط" },
    { id: 291, arab: "مدار أرضي منخفض", transliterasi: "Madār Arḍī Munkhafid", indo: "Orbit Rendah Bumi", inggris: "Low Earth Orbit", definisi: "Orbit satelit di ketinggian 160-2000 km.", link: "https://id.wikipedia.org/wiki/Orbit_rendah_Bumi", huruf: "O", hurufHijaiyah: "م" },
    { id: 292, arab: "المــُضِي", transliterasi: "al-Muḍī", indo: "Lucida", inggris: "Lucida", definisi: "Istilah untuk bintang tercerah dalam rasi.", link: "https://en.wikipedia.org/wiki/Lucida_(star)", huruf: "L", hurufHijaiyah: "م" },
    { id: 293, arab: "اجرام منيرة", transliterasi: "Ajrām Munīrah", indo: "Luminous", inggris: "Luminous", definisi: "Benda langit yang memancarkan cahaya sendiri.", link: "https://id.wikipedia.org/wiki/Luminositas", huruf: "L", hurufHijaiyah: "ا" },
    { id: 294, arab: "قمري", transliterasi: "Qamarī", indo: "Lunar", inggris: "Lunar", definisi: "Berhubungan dengan Bulan.", link: "https://id.wikipedia.org/wiki/Bulan", huruf: "L", hurufHijaiyah: "ق" },
    { id: 295, arab: "دور قمري", transliterasi: "Dawr Qamarī", indo: "Siklus Bulan", inggris: "Lunar cycle", definisi: "Siklus fase Bulan sekitar 29,5 hari.", link: "https://id.wikipedia.org/wiki/Fase_Bulan", huruf: "S", hurufHijaiyah: "د" },
    { id: 296, arab: "الشهر القمري", transliterasi: "ash-Shahr al-Qamarī", indo: "Bulan Sinodis", inggris: "Lunation", definisi: "Satu siklus fase Bulan ke fase yang sama.", link: "https://id.wikipedia.org/wiki/Bulan_sinodis", huruf: "B", hurufHijaiyah: "ش" },
    { id: 297, arab: "السبع", transliterasi: "as-Sabu'", indo: "Lupus", inggris: "Lupus", definisi: "Rasi serigala di langit selatan.", link: "https://id.wikipedia.org/wiki/Lupus_(rasi_bintang)", huruf: "L", hurufHijaiyah: "س" },
    { id: 298, arab: "الوشق", transliterasi: "al-Washaq", indo: "Lynx", inggris: "Lynx", definisi: "Rasi bintang samar di langit utara.", link: "https://id.wikipedia.org/wiki/Lynx_(rasi_bintang)", huruf: "L", hurufHijaiyah: "و" }, 
    { id: 299, arab: "الشَّلياق", transliterasi: "ash-Shilliyāq", indo: "Lyra", inggris: "Lyra", definisi: "Rasi kecil berisi bintang Vega.", link: "https://id.wikipedia.org/wiki/Lyra_(rasi_bintang)", huruf: "L", hurufHijaiyah: "ش" },

// Entri Huruf M
    { id: 300, arab: "سفَع الشمس", transliterasi: "Sufa' ash-Shams", indo: "Bintik Matahari", inggris: "Maculae", definisi: "Bintik gelap di permukaan Matahari akibat aktivitas magnetik.", link: "https://id.wikipedia.org/wiki/Bintik_matahari", huruf: "B", hurufHijaiyah: "س" },
    { id: 301, arab: "سُحُب مجليَّة", transliterasi: "Suḥub Majalliyyah", indo: "Awan Magellan", inggris: "Magellanic clouds", definisi: "Dua galaksi satelit Bimasakti yang terlihat dari belahan selatan.", link: "https://id.wikipedia.org/wiki/Awan_Magellan", huruf: "A", hurufHijaiyah: "س" },
    { id: 302, arab: "تكبير", transliterasi: "Takbīr", indo: "Pembesaran", inggris: "Magnifying", definisi: "Perbesaran bayangan objek langit melalui teleskop.", link: "https://id.wikipedia.org/wiki/Pembesaran", huruf: "P", hurufHijaiyah: "ت" },
    { id: 303, arab: "قَدْر", transliterasi: "Qadr", indo: "Magnitudo", inggris: "Magnitude", definisi: "Tingkat kecerahan benda langit, makin kecil angkanya makin terang.", link: "https://id.wikipedia.org/wiki/Magnitudo_(astronomi)", huruf: "M", hurufHijaiyah: "ق" },
    { id: 304, arab: "ميْة", transliterasi: "Mīyah", indo: "Maia", inggris: "Maia", definisi: "Bintang di gugus Pleiades (rasi Taurus).", link: "https://id.wikipedia.org/wiki/Maia_(bintang)", huruf: "M", hurufHijaiyah: "م" },
    { id: 305, arab: "السارية", transliterasi: "as-Sāriyah", indo: "Malus", inggris: "Malus", definisi: "Rasi bintang yang sudah tidak digunakan lagi (Tiang Layar).", link: "https://en.wikipedia.org/wiki/Malus_(constellation)", huruf: "M", hurufHijaiyah: "س" },
    { id: 306, arab: "المرّيخ", transliterasi: "al-Mirrīkh", indo: "Mars", inggris: "Mars", definisi: "Planet merah keempat dari Matahari.", link: "https://id.wikipedia.org/wiki/Mars", huruf: "M", hurufHijaiyah: "م" },
    { id: 307, arab: "كتلة", transliterasi: "Kutlah", indo: "Massa", inggris: "Mass", definisi: "Jumlah materi yang terkandung dalam benda langit.", link: "https://id.wikipedia.org/wiki/Massa", huruf: "M", hurufHijaiyah: "ك" },
    { id: 308, arab: "معظم", transliterasi: "Mu'aẓẓam", indo: "Maksimum", inggris: "Maximum", definisi: "Nilai tertinggi atau titik puncak suatu fenomena langit.", link: "https://id.wikipedia.org/wiki/Maksimum", huruf: "M", hurufHijaiyah: "م" },
    { id: 309, arab: "معدل", transliterasi: "Mu'addal", indo: "Rata-rata", inggris: "Mean", definisi: "Nilai tengah dari data pengamatan astronomi.", link: "https://id.wikipedia.org/wiki/Rata-rata", huruf: "R", hurufHijaiyah: "م" },
    { id: 310, arab: "الزمان الوسطيّ", transliterasi: "az-Zamān al-Wasaṭī", indo: "Waktu Rata-rata", inggris: "Mean time", definisi: "Waktu berdasarkan posisi rata-rata Matahari (tanpa persamaan waktu).", link: "https://id.wikipedia.org/wiki/Waktu_matahari_rata-rata", huruf: "W", hurufHijaiyah: "ز" },
    { id: 311, arab: "الميكانيكا الفلكية", transliterasi: "al-Mīkānīkā al-Falakiyyah", indo: "Mekanika Langit", inggris: "Mechanics, celestial", definisi: "Cabang fisika yang mempelajari gerak benda-benda langit.", link: "https://id.wikipedia.org/wiki/Mekanika_langit", huruf: "M", hurufHijaiyah: "م" },
    { id: 312, arab: "عُطارد", transliterasi: "ʿUṭārid", indo: "Merkurius", inggris: "Mercury", definisi: "Planet terkecil dan terdekat dengan Matahari.", link: "https://id.wikipedia.org/wiki/Merkurius", huruf: "M", hurufHijaiyah: "ع" },
    { id: 313, arab: "الهاجرة", transliterasi: "al-Hājirah", indo: "Meridian", inggris: "Meridian", definisi: "Garis khayal utara-selatan yang melewati titik zenith.", link: "https://id.wikipedia.org/wiki/Meridian_(astronomi)", huruf: "M", hurufHijaiyah: "ه" },
    { id: 314, arab: "نيزك", transliterasi: "Nayzak", indo: "Meteor", inggris: "Meteor", definisi: "Cahaya jatuhnya meteoroid yang terbakar di atmosfer Bumi.", link: "https://id.wikipedia.org/wiki/Meteor", huruf: "M", hurufHijaiyah: "ن" },
    { id: 315, arab: "نيزكي", transliterasi: "Nayzakī", indo: "Meteorik", inggris: "Meteoric", definisi: "Berhubungan dengan meteor atau fenomena meteor.", link: "https://id.wikipedia.org/wiki/Meteor", huruf: "M", hurufHijaiyah: "ن" },
    { id: 316, arab: "رُجم", transliterasi: "Rujm", indo: "Batu Meteor", inggris: "Meteoric Stones", definisi: "Meteorit yang mencapai permukaan Bumi.", link: "https://id.wikipedia.org/wiki/Meteorit", huruf: "B", hurufHijaiyah: "ر" },
    { id: 317, arab: "الدور الميتوني", transliterasi: "ad-Dawr al-Mītūnī", indo: "Siklus Metonik", inggris: "Metonic Cycle", definisi: "Siklus 19 tahun yang menyamakan kalender lunar dan solar.", link: "https://id.wikipedia.org/wiki/Siklus_Meton", huruf: "S", hurufHijaiyah: "د" },
    { id: 318, arab: "المـِيَاه", transliterasi: "al-Mīyāh", indo: "Miaplacidus", inggris: "Miaplacidus", definisi: "Bintang tercerah di rasi Carina.", link: "https://en.wikipedia.org/wiki/Miaplacidus", huruf: "M", hurufHijaiyah: "م" },
    { id: 319, arab: "المدقق", transliterasi: "al-Mudaqqiq", indo: "Mikrometer", inggris: "Micrometer", definisi: "Instrumen untuk mengukur sudut kecil benda langit.", link: "https://id.wikipedia.org/wiki/Mikrometer_(alat)", huruf: "M", hurufHijaiyah: "م" },
    { id: 320, arab: "المجْهَر", transliterasi: "al-Mijhar", indo: "Mikroskop", inggris: "Microscope", definisi: "Alat optik untuk mengamati objek kecil, digunakan juga dalam astronomi.", link: "https://id.wikipedia.org/wiki/Mikroskop", huruf: "M", hurufHijaiyah: "م" },
    { id: 321, arab: "الميكرسكوب", transliterasi: "al-Mīkruskūb", indo: "Mikroskopium", inggris: "Microscopium", definisi: "Rasi bintang kecil di langit selatan.", link: "https://id.wikipedia.org/wiki/Mikroskopium_(rasi_bintang)", huruf: "M", hurufHijaiyah: "م" },
    { id: 322, arab: "نصف الليل", transliterasi: "Niṣf al-Layl", indo: "Tengah Malam", inggris: "Midnight", definisi: "Waktu saat Matahari berada di titik terendah di bawah horizon.", link: "https://id.wikipedia.org/wiki/Tengah_malam", huruf: "T", hurufHijaiyah: "ن" },
    { id: 323, arab: "المجرة , درب التبانة", transliterasi: "al-Majarrah, Darb at-Tabbānah", indo: "Bimasakti", inggris: "Milky Way", definisi: "Galaksi spiral tempat tata surya kita berada.", link: "https://id.wikipedia.org/wiki/Bima_Sakti", huruf: "B", hurufHijaiyah: "م" },
    { id: 324, arab: "مصغر", transliterasi: "Muṣaghir", indo: "Minimum", inggris: "Minimum", definisi: "Nilai terendah atau titik terkecil suatu fenomena langit.", link: "https://id.wikipedia.org/wiki/Minimum", huruf: "M", hurufHijaiyah: "م" },
    { id: 325, arab: "مرآة الافق", transliterasi: "Mir'āh al-Ufuq", indo: "Cermin Horizon", inggris: "Mirror, horizon", definisi: "Cermin pada sextant untuk mengukur ketinggian benda langit.", link: "https://id.wikipedia.org/wiki/Sextant", huruf: "C", hurufHijaiyah: "م" },
    { id: 326, arab: "مرآة الزند", transliterasi: "Mir'āh az-Zind", indo: "Cermin Indeks", inggris: "Mirror, Index", definisi: "Cermin bergerak pada sextant untuk mengukur sudut.", link: "https://id.wikipedia.org/wiki/Sextant", huruf: "C", hurufHijaiyah: "م" },
    { id: 327, arab: "عزم", transliterasi: "ʿAzm", indo: "Momen", inggris: "Moment", definisi: "Ukuran kecenderungan gaya untuk memutar suatu benda.", link: "https://id.wikipedia.org/wiki/Momen_gaya", huruf: "M", hurufHijaiyah: "ع" },
    { id: 328, arab: "زخم", transliterasi: "Zakham", indo: "Momentum", inggris: "Momentum", definisi: "Hasil kali massa dan kecepatan benda langit.", link: "https://id.wikipedia.org/wiki/Momentum", huruf: "M", hurufHijaiyah: "ز" },
    { id: 329, arab: "وحيد القرن", transliterasi: "Waḥīd al-Qarn", indo: "Monoceros", inggris: "Monoceros", definisi: "Rasi bintang unicorn di ekuator langit.", link: "https://id.wikipedia.org/wiki/Monoceros_(rasi_bintang)", huruf: "M", hurufHijaiyah: "و" },
    { id: 330, arab: "الشهر", transliterasi: "ash-Shahr", indo: "Bulan (Kalender)", inggris: "Month", definisi: "Periode waktu berdasarkan siklus Bulan atau kalender.", link: "https://id.wikipedia.org/wiki/Bulan_(penanggalan)", huruf: "B", hurufHijaiyah: "ش" },
    { id: 331, arab: "الشهر النجومي", transliterasi: "ash-Shahr an-Nujūmī", indo: "Bulan Sideris", inggris: "Month, siderial", definisi: "Periode orbit Bulan mengelilingi Bumi relatif terhadap bintang (~27,3 hari).", link: "https://id.wikipedia.org/wiki/Bulan_sideris", huruf: "B", hurufHijaiyah: "ش" },
    { id: 332, arab: "الشهر الاقتراني", transliterasi: "ash-Shahr al-Iqtirānī", indo: "Bulan Sinodis", inggris: "Month, synodic", definisi: "Periode dari satu fase Bulan ke fase yang sama (~29,5 hari).", link: "https://id.wikipedia.org/wiki/Bulan_sinodis", huruf: "B", hurufHijaiyah: "ش" },
    { id: 333, arab: "القمر", transliterasi: "al-Qamar", indo: "Bulan", inggris: "Moon", definisi: "Satelit alami Bumi yang menerangi malam.", link: "https://id.wikipedia.org/wiki/Bulan", huruf: "B", hurufHijaiyah: "ق" },
    { id: 334, arab: "الربع الاول", transliterasi: "ar-Rabu' al-Awwal", indo: "Kuartal Pertama", inggris: "Moon, First quarter", definisi: "Fase Bulan saat setengah piringan tampak terang.", link: "https://id.wikipedia.org/wiki/Fase_Bulan#Kuartal_pertama", huruf: "K", hurufHijaiyah: "ر" },
    { id: 335, arab: "البدر", transliterasi: "al-Badr", indo: "Bulan Purnama", inggris: "Moon, Full moon", definisi: "Fase saat Bulan tampak bulat penuh dari Bumi.", link: "https://id.wikipedia.org/wiki/Bulan_purnama", huruf: "B", hurufHijaiyah: "ب" },
    { id: 336, arab: "الهلال", transliterasi: "al-Hilāl", indo: "Bulan Sabit", inggris: "Moon, New moon", definisi: "Fase awal Bulan yang tampak tipis sabit.", link: "https://id.wikipedia.org/wiki/Bulan_baru", huruf: "B", hurufHijaiyah: "ه" },
    { id: 337, arab: "الربع الثاني", transliterasi: "ar-Rabu' ath-Thānī", indo: "Kuartal Akhir", inggris: "Moon, Second or last quarter", definisi: "Fase Bulan saat setengah piringan tampak terang (fase terakhir).", link: "https://id.wikipedia.org/wiki/Fase_Bulan#Kuartal_ketiga", huruf: "K", hurufHijaiyah: "ر" },
    { id: 338, arab: "منازل القمر", transliterasi: "Manāzil al-Qamar", indo: "Manazil Bulan", inggris: "Moon stations", definisi: "28 posisi Bulan dalam perjalanannya mengelilingi Zodiak.", link: "https://id.wikipedia.org/wiki/Manazil_al-qamar", huruf: "M", hurufHijaiyah: "م" },
    { id: 339, arab: "الحرَكَة", transliterasi: "al-Ḥarakah", indo: "Gerakan", inggris: "Motion", definisi: "Perubahan posisi benda langit relatif terhadap kerangka acuan.", link: "https://id.wikipedia.org/wiki/Gerak", huruf: "G", hurufHijaiyah: "ح" },
    { id: 340, arab: "الحركة المستقيمة", transliterasi: "al-Ḥarakah al-Mustaqīmah", indo: "Gerak Langsung", inggris: "Motion, direct", definisi: "Gerak planet dari barat ke timur (arah normal) relatif terhadap bintang.", link: "https://id.wikipedia.org/wiki/Gerak_prograde", huruf: "G", hurufHijaiyah: "ح" },
    { id: 341, arab: "الحركة الرجعية", transliterasi: "al-Ḥarakah ar-Raj'iyyah", indo: "Gerak Mundur", inggris: "Motion, retrograde", definisi: "Gerak planet semu dari timur ke barat akibat perbedaan kecepatan orbit.", link: "https://id.wikipedia.org/wiki/Gerak_retrograd", huruf: "G", hurufHijaiyah: "ح" },
    { id: 342, arab: "النجوم المتعددة", transliterasi: "an-Nujūm al-Muta'addidah", indo: "Bintang Majemuk", inggris: "Multiple stars", definisi: "Sistem bintang yang terdiri dari tiga atau lebih bintang.", link: "https://id.wikipedia.org/wiki/Bintang_majemuk", huruf: "B", hurufHijaiyah: "ن" },

// Entri Huruf N
    { id: 343, arab: "الناطح", transliterasi: "an-Nāṭiḥ", indo: "Nath", inggris: "Nath", definisi: "Bintang di rasi Taurus (salah satu tanduk banteng).", link: "https://id.wikipedia.org/wiki/Beta_Tauri", huruf: "N", hurufHijaiyah: "ن" },
    { id: 344, arab: "الملاحة", transliterasi: "al-Milāḥah", indo: "Navigasi", inggris: "Navigation", definisi: "Ilmu menentukan posisi dan arah di permukaan Bumi dengan bantuan langit.", link: "https://id.wikipedia.org/wiki/Navigasi", huruf: "N", hurufHijaiyah: "م" },
    { id: 345, arab: "سديم", transliterasi: "Sadīm", indo: "Nebula", inggris: "Nebula", definisi: "Awan gas dan debu antarbintang di luar angkasa.", link: "https://id.wikipedia.org/wiki/Nebula", huruf: "N", hurufHijaiyah: "س" },
    { id: 346, arab: "سديم حلقي", transliterasi: "Sadīm Ḥalaqī", indo: "Nebula Cincin", inggris: "Nebula, ring", definisi: "Nebula berbentuk cincin seperti Nebula Cincin di rasi Lyra.", link: "https://id.wikipedia.org/wiki/Nebula_Cincin", huruf: "N", hurufHijaiyah: "س" },
    { id: 347, arab: "سديم لولبي", transliterasi: "Sadīm Lawlabī", indo: "Nebula Spiral", inggris: "Nebula, spiral", definisi: "Nebula yang memiliki struktur spiral (galaksi spiral).", link: "https://id.wikipedia.org/wiki/Galaksi_spiral", huruf: "N", hurufHijaiyah: "س" },
    { id: 348, arab: "سُدُم", transliterasi: "Sudum", indo: "Nebula (jamak)", inggris: "Nebulae", definisi: "Bentuk jamak dari nebula (awan-awan antarbintang).", link: "https://id.wikipedia.org/wiki/Nebula", huruf: "N", hurufHijaiyah: "س" },
    { id: 349, arab: "نبتون", transliterasi: "Nibtūn", indo: "Neptunus", inggris: "Neptune", definisi: "Planet kedelapan dan terjauh dari Matahari.", link: "https://id.wikipedia.org/wiki/Neptunus", huruf: "N", hurufHijaiyah: "ن" },
    { id: 350, arab: "النجم النيوتروني", transliterasi: "an-Najm an-Nīyūtrūnī", indo: "Bintang Neutron", inggris: "Neutron Star", definisi: "Sisa inti bintang masif yang sangat padat setelah supernova.", link: "https://id.wikipedia.org/wiki/Bintang_neutron", huruf: "B", hurufHijaiyah: "ن" },
    { id: 351, arab: "الهلال", transliterasi: "al-Hilāl", indo: "Bulan Sabit", inggris: "New Moon", definisi: "Fase Bulan saat hanya terlihat sabit tipis di awal bulan.", link: "https://id.wikipedia.org/wiki/Bulan_sabit", huruf: "B", hurufHijaiyah: "ه" },
    { id: 352, arab: "الليل", transliterasi: "al-Layl", indo: "Malam", inggris: "Night", definisi: "Periode gelap saat Matahari berada di bawah horizon.", link: "https://id.wikipedia.org/wiki/Malam", huruf: "M", hurufHijaiyah: "ل" },
    { id: 353, arab: "العُقدة", transliterasi: "al-ʿUqdah", indo: "Node", inggris: "Node", definisi: "Titik perpotongan orbit benda langit dengan bidang ekliptika.", link: "https://en.wikipedia.org/wiki/Orbital_node", huruf: "N", hurufHijaiyah: "ع" },
    { id: 354, arab: "الظهر", transliterasi: "aẓ-Ẓuhr", indo: "Tengah Hari", inggris: "Noon", definisi: "Waktu saat Matahari berada di titik tertinggi di meridian.", link: "https://id.wikipedia.org/wiki/Tengah_hari", huruf: "T", hurufHijaiyah: "ظ" },
    { id: 355, arab: "مسطرة النقاش", transliterasi: "Masṭarat an-Naqqāsh", indo: "Norma", inggris: "Norma", definisi: "Rasi bintang kecil di langit selatan (Siku-siku).", link: "https://id.wikipedia.org/wiki/Norma_(rasi_bintang)", huruf: "N", hurufHijaiyah: "م" },
    { id: 356, arab: "نجم جديد", transliterasi: "Najm Jadīd", indo: "Nova", inggris: "Nova", definisi: "Bintang yang tiba-tiba meledak dan meningkat kecerahannya.", link: "https://id.wikipedia.org/wiki/Nova", huruf: "N", hurufHijaiyah: "ن" },
    { id: 357, arab: "نواة", transliterasi: "Nawāh", indo: "Inti", inggris: "Nucleus", definisi: "Bagian pusat galaksi, komet, atau benda langit lainnya.", link: "https://en.wikipedia.org/wiki/Nucleus_(astronomy)", huruf: "I", hurufHijaiyah: "ن" },
    { id: 358, arab: "الكبو", transliterasi: "al-Kabū", indo: "Nutasi", inggris: "Nutation", definisi: "Goyangan sumbu rotasi Bumi secara periodik.", link: "https://id.wikipedia.org/wiki/Nutasi", huruf: "N", hurufHijaiyah: "ك" },

// Entri Huruf O
    { id: 359, arab: "بِلْورة الشَبح", transliterasi: "Bilwarah ash-Shabaḥ", indo: "Benda Lensa", inggris: "Object Glass", definisi: "Lensa utama pada teleskop atau mikroskop.", link: "https://id.wikipedia.org/wiki/Lensa_objektif", huruf: "B", hurufHijaiyah: "ب" },
    { id: 360, arab: "تسطيح", transliterasi: "Tasṭīḥ", indo: "Kepepihan", inggris: "Oblateness", definisi: "Tingkat pemipihan Bumi atau planet di kutub.", link: "https://en.wikipedia.org/wiki/Oblateness", huruf: "K", hurufHijaiyah: "ت" },
    { id: 361, arab: "مَيل فلك البروج", transliterasi: "Mayl Falak al-Burūj", indo: "Kemiringan Ekliptika", inggris: "Obliquity of the Ecliptic", definisi: "Sudut kemiringan sumbu Bumi terhadap bidang orbit (~23,5°).", link: "https://id.wikipedia.org/wiki/Kemiringan_ekliptika", huruf: "K", hurufHijaiyah: "م" },
    { id: 362, arab: "مَرْصد", transliterasi: "Marṣad", indo: "Observatorium", inggris: "Observatory", definisi: "Tempat atau bangunan untuk melakukan pengamatan astronomi.", link: "https://id.wikipedia.org/wiki/Observatorium", huruf: "O", hurufHijaiyah: "م" },
    { id: 363, arab: "استتار", transliterasi: "Istitār", indo: "Okultasi", inggris: "Occultation", definisi: "Peristiwa tertutupnya suatu benda langit oleh benda lain yang lebih besar.", link: "https://id.wikipedia.org/wiki/Okultasi", huruf: "O", hurufHijaiyah: "ا" },
    { id: 364, arab: "الثُمُن", transliterasi: "ath-Thumun", indo: "Octans", inggris: "Octans", definisi: "Rasi bintang yang mengandung Kutub Selatan langit.", link: "https://id.wikipedia.org/wiki/Octans_(rasi_bintang)", huruf: "O", hurufHijaiyah: "ث" },
    { id: 365, arab: "مظلم", transliterasi: "Muẓlim", indo: "Benda Gelap", inggris: "Opaque", definisi: "Objek langit yang tidak memancarkan atau memantulkan cahaya.", link: "https://en.wikipedia.org/wiki/Opacity_(optics)", huruf: "B", hurufHijaiyah: "م" },
    { id: 366, arab: "الحواء", transliterasi: "al-Ḥawwā'", indo: "Ophiuchus", inggris: "Ophiuchus", definisi: "Rasi bintang pembawa ular di ekuator langit.", link: "https://id.wikipedia.org/wiki/Ophiuchus_(rasi_bintang)", huruf: "O", hurufHijaiyah: "ح" },
    { id: 367, arab: "الاستقبال", transliterasi: "al-Istiqbāl", indo: "Oposisi", inggris: "Opposition", definisi: "Posisi planet di sisi berlawanan Matahari dari Bumi.", link: "https://id.wikipedia.org/wiki/Oposisi_(astronomi)", huruf: "O", hurufHijaiyah: "ا" },
    { id: 368, arab: "الفلك", transliterasi: "al-Falak", indo: "Orbit", inggris: "Orbit", definisi: "Jalur lengkung yang dilalui benda langit mengelilingi pusat gravitasi.", link: "https://id.wikipedia.org/wiki/Orbit", huruf: "O", hurufHijaiyah: "ف" },
    { id: 369, arab: "الفترة المدارية", transliterasi: "al-Fatrah al-Madāriyyah", indo: "Periode Orbit", inggris: "Orbital Period", definisi: "Waktu yang dibutuhkan benda langit untuk satu kali orbit penuh.", link: "https://id.wikipedia.org/wiki/Periode_orbit", huruf: "P", hurufHijaiyah: "ف" },
    { id: 370, arab: "فلك الارض", transliterasi: "Falak al-Arḍ", indo: "Orbit Bumi", inggris: "Orbit of the earth", definisi: "Jalur elips Bumi mengelilingi Matahari.", link: "https://id.wikipedia.org/wiki/Orbit_Bumi", huruf: "O", hurufHijaiyah: "ف" },
    { id: 371, arab: "الجبّار", transliterasi: "al-Jabbār", indo: "Orion", inggris: "Orion", definisi: "Rasi bintang pemburu yang sangat terkenal di ekuator langit.", link: "https://id.wikipedia.org/wiki/Orion_(rasi_bintang)", huruf: "O", hurufHijaiyah: "ج" },
    { id: 372, arab: "تراوح", transliterasi: "Tarāwuḥ", indo: "Osilasi", inggris: "Oscillation", definisi: "Gerakan bolak-balik atau getaran periodik benda langit.", link: "https://id.wikipedia.org/wiki/Osilasi", huruf: "O", hurufHijaiyah: "ت" },
    { id: 373, arab: "الفضاء الخارجي", transliterasi: "al-Faḍā' al-Khārijī", indo: "Luar Angkasa", inggris: "Outer Space", definisi: "Ruang di luar atmosfer Bumi yang sangat luas.", link: "https://id.wikipedia.org/wiki/Luar_angkasa", huruf: "L", hurufHijaiyah: "ف" },

// Entri Huruf P
    { id: 374, arab: "القطع المكافئ", transliterasi: "al-Qaṭ' al-Mukāfi'", indo: "Parabola", inggris: "Parabola", definisi: "Kurva berbentuk orbit benda yang tidak kembali (lintasan lepas).", link: "https://id.wikipedia.org/wiki/Parabola", huruf: "P", hurufHijaiyah: "ق" },
    { id: 375, arab: "شَلْجَمِيّ", transliterasi: "Shaljamī", indo: "Parabolik", inggris: "Parabolic", definisi: "Berbentuk parabola, misalnya lintasan komet hiperbolik.", link: "https://id.wikipedia.org/wiki/Parabola", huruf: "P", hurufHijaiyah: "ش" },
    { id: 376, arab: "اختلاف المنظر", transliterasi: "Ikhtilāf al-Manẓar", indo: "Paralaks", inggris: "Parallax", definisi: "Perubahan posisi bintang akibat pergerakan pengamat.", link: "https://id.wikipedia.org/wiki/Paralaks", huruf: "P", hurufHijaiyah: "ا" },
    { id: 377, arab: "دوائر الميَل", transliterasi: "Dawā'ir al-Mayl", indo: "Lingkaran Deklinasi", inggris: "Parallels of declination", definisi: "Lingkaran kecil sejajar dengan ekuator langit.", link: "https://en.wikipedia.org/wiki/Parallel_of_declination", huruf: "L", hurufHijaiyah: "د" },
    { id: 378, arab: "دوائر العرض", transliterasi: "Dawā'ir al-'Arḍ", indo: "Lingkaran Lintang", inggris: "Parallels of latitude", definisi: "Lingkaran sejajar dengan ekuator Bumi.", link: "https://id.wikipedia.org/wiki/Lintang_geografis", huruf: "L", hurufHijaiyah: "د" },
    { id: 379, arab: "مسار", transliterasi: "Masār", indo: "Jalur", inggris: "Path", definisi: "Lintasan atau trajektori benda langit.", link: "https://id.wikipedia.org/wiki/Lintasan", huruf: "J", hurufHijaiyah: "م" },
    { id: 380, arab: "الطاووس", transliterasi: "aṭ-Ṭāwūs", indo: "Pavo", inggris: "Pavo", definisi: "Rasi bintang merak di langit selatan.", link: "https://id.wikipedia.org/wiki/Pavo_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ط" },
    { id: 381, arab: "الفرس الأعظم", transliterasi: "al-Faras al-A'ẓam", indo: "Pegasus", inggris: "Pegasus", definisi: "Rasi bintang kuda bersayap di langit utara.", link: "https://id.wikipedia.org/wiki/Pegasus_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ف" },
    { id: 382, arab: "الظُليل", transliterasi: "aẓ-Ẓulīl", indo: "Penumbra", inggris: "Penumbra", definisi: "Bayangan samar di luar umbra saat gerhana.", link: "https://id.wikipedia.org/wiki/Penumbra", huruf: "P", hurufHijaiyah: "ظ" },
    { id: 383, arab: "الحضيض", transliterasi: "al-Ḥaḍīḍ", indo: "Perigee", inggris: "Perigee", definisi: "Titik terdekat orbit Bulan dari Bumi.", link: "https://id.wikipedia.org/wiki/Perigeum", huruf: "P", hurufHijaiyah: "ح" },
    { id: 384, arab: "نقطة الرأس", transliterasi: "Nuqṭat ar-Ra's", indo: "Perihelion", inggris: "Perihelion", definisi: "Titik terdekat planet dari Matahari.", link: "https://id.wikipedia.org/wiki/Perihelion", huruf: "P", hurufHijaiyah: "ن" },
    { id: 385, arab: "الدَّور او المدَّة", transliterasi: "ad-Dawr aw al-Muddah", indo: "Periode", inggris: "Period", definisi: "Waktu satu siklus lengkap gerakan periodik.", link: "https://id.wikipedia.org/wiki/Periode", huruf: "P", hurufHijaiyah: "د" },
    { id: 386, arab: "النجوم المتغيرة", transliterasi: "an-Nujūm al-Mutaghayyirah", indo: "Bintang Variabel", inggris: "Periodical Stars", definisi: "Bintang yang kecerahannya berubah secara periodik.", link: "https://id.wikipedia.org/wiki/Bintang_variabel", huruf: "B", hurufHijaiyah: "ن" },
    { id: 387, arab: "اليوم الدائم", transliterasi: "al-Yawm ad-Dā'im", indo: "Hari Abadi", inggris: "Perpetual Day", definisi: "Hari tanpa malam di wilayah kutub saat musim panas.", link: "https://id.wikipedia.org/wiki/Matahari_tengah_malam", huruf: "H", hurufHijaiyah: "ي" },
    { id: 388, arab: "الليل الدائم", transliterasi: "al-Layl ad-Dā'im", indo: "Malam Abadi", inggris: "Perpetual Night", definisi: "Malam tanpa siang di wilayah kutub saat musim dingin.", link: "https://id.wikipedia.org/wiki/Malam_kutub", huruf: "M", hurufHijaiyah: "ل" },
    { id: 389, arab: "فرساوس", transliterasi: "Farsāwus", indo: "Perseus", inggris: "Perseus", definisi: "Rasi bintang pembawa kepala Medusa di langit utara.", link: "https://id.wikipedia.org/wiki/Perseus_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ف" },
    { id: 390, arab: "الاضطرابات", transliterasi: "al-Iḍṭirābāt", indo: "Gangguan", inggris: "Perturbations", definisi: "Penyimpangan orbit akibat gaya gravitasi benda lain.", link: "https://en.wikipedia.org/wiki/Perturbation_(astronomy)", huruf: "G", hurufHijaiyah: "ا" },
    { id: 391, arab: "فخذ الدّب الأكبر", transliterasi: "Fakhdh ad-Dubb al-Akbar", indo: "Phacd", inggris: "Phacd", definisi: "Bintang di rasi Ursa Major (paha beruang besar).", link: "https://en.wikipedia.org/wiki/Phecda", huruf: "P", hurufHijaiyah: "ف" },
    { id: 392, arab: "الفاختة", transliterasi: "al-Fākhitah", indo: "Phact", inggris: "Phact", definisi: "Bintang di rasi Columba (merpati).", link: "https://en.wikipedia.org/wiki/Phact", huruf: "P", hurufHijaiyah: "ف" },
    { id: 393, arab: "وَجه", transliterasi: "Wajh", indo: "Fase", inggris: "Phase", definisi: "Tampilan atau bentuk suatu benda langit (misal fase Bulan).", link: "https://id.wikipedia.org/wiki/Fase", huruf: "F", hurufHijaiyah: "و" },
    { id: 394, arab: "اوجه القمر", transliterasi: "Awjuh al-Qamar", indo: "Fase Bulan", inggris: "Phases of the moon", definisi: "Perubahan penampakan Bulan dari Bumi selama siklus.", link: "https://id.wikipedia.org/wiki/Fase_Bulan", huruf: "F", hurufHijaiyah: "ا" },
    { id: 395, arab: "الفَكَّة", transliterasi: "al-Fakkah", indo: "Phecca", inggris: "Phecca", definisi: "Bintang di rasi Corona Borealis.", link: "https://en.wikipedia.org/wiki/Alpha_Coronae_Borealis", huruf: "P", hurufHijaiyah: "ف" },
    { id: 396, arab: "ظواهر", transliterasi: "Ẓawāhir", indo: "Fenomena", inggris: "Phenomena", definisi: "Peristiwa alam yang dapat diamati di langit.", link: "https://id.wikipedia.org/wiki/Fenomena", huruf: "F", hurufHijaiyah: "ظ" },
    { id: 397, arab: "الفَرقَد", transliterasi: "al-Farqad", indo: "Pherkad", inggris: "Pherkad", definisi: "Bintang di rasi Ursa Minor (salah satu penunjuk kutub).", link: "https://en.wikipedia.org/wiki/Pherkad", huruf: "P", hurufHijaiyah: "ف" },
    { id: 398, arab: "العَنقاء", transliterasi: "al-'Anqā'", indo: "Phoenix", inggris: "Phoenix", definisi: "Rasi bintang burung api di langit selatan.", link: "https://id.wikipedia.org/wiki/Phoenix_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ع" },
    { id: 399, arab: "ضوئ", transliterasi: "Ḍaw'", indo: "Foton", inggris: "Photon", definisi: "Partikel dasar pembawa cahaya dan radiasi elektromagnetik.", link: "https://id.wikipedia.org/wiki/Foton", huruf: "F", hurufHijaiyah: "ض" },
    { id: 400, arab: "الفوتوميتر", transliterasi: "al-Fūtūmītar", indo: "Fotometer", inggris: "Photometer", definisi: "Alat untuk mengukur intensitas cahaya dari benda langit.", link: "https://id.wikipedia.org/wiki/Fotometer", huruf: "F", hurufHijaiyah: "ف" },
    { id: 401, arab: "قياس اللمعان", transliterasi: "Qiyās al-Lum'ān", indo: "Fotometri", inggris: "Photometry", definisi: "Ilmu pengukuran fluks cahaya dari objek astronomi.", link: "https://id.wikipedia.org/wiki/Fotometri", huruf: "F", hurufHijaiyah: "ق" },
    { id: 402, arab: "الفوتوسفير", transliterasi: "al-Fūtūsfīr", indo: "Fotosfer", inggris: "Photosphere", definisi: "Lapisan permukaan Matahari yang memancarkan cahaya tampak.", link: "https://id.wikipedia.org/wiki/Fotosfer", huruf: "F", hurufHijaiyah: "ف" },
    { id: 403, arab: "علم طبيعة الاجرام الفلكية", transliterasi: "'Ilm Ṭabī'at al-Ajrām al-Falakiyyah", indo: "Astronomi Fisik", inggris: "Physical Astronomy", definisi: "Cabang astronomi yang mempelajari sifat fisika benda langit.", link: "https://id.wikipedia.org/wiki/Astrofisika", huruf: "A", hurufHijaiyah: "ع" },
    { id: 404, arab: "الحوت", transliterasi: "al-Ḥūt", indo: "Pisces", inggris: "Pisces", definisi: "Rasi zodiak ke-12 yang berbentuk ikan.", link: "https://id.wikipedia.org/wiki/Pisces_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ح" },
    { id: 405, arab: "القبة الفلكية الاصطناعية", transliterasi: "al-Qubbah al-Falakiyyah al-Iṣṭinā'iyyah", indo: "Planetarium", inggris: "Planetarium", definisi: "Bangunan atau alat untuk memproyeksikan langit berbintang.", link: "https://id.wikipedia.org/wiki/Planetarium", huruf: "P", hurufHijaiyah: "ق" },
    { id: 406, arab: "السيارات الصغرى", transliterasi: "as-Sayyārāt aṣ-Ṣughrā", indo: "Planetoid", inggris: "Planetoids", definisi: "Benda langit kecil yang mengorbit Matahari (asteroid).", link: "https://id.wikipedia.org/wiki/Asteroid", huruf: "P", hurufHijaiyah: "س" },
    { id: 407, arab: "كوكب", transliterasi: "Kawkab", indo: "Planet", inggris: "Planet", definisi: "Benda langit yang mengorbit bintang dan cukup besar.", link: "https://id.wikipedia.org/wiki/Planet", huruf: "P", hurufHijaiyah: "ك" },
    { id: 408, arab: "السيارات , كَواكِب", transliterasi: "as-Sayyārāt, Kawākib", indo: "Planet-planet", inggris: "Planets", definisi: "Benda langit yang mengelilingi Matahari atau bintang lain.", link: "https://id.wikipedia.org/wiki/Planet", huruf: "P", hurufHijaiyah: "س" },
    { id: 409, arab: "بلوتو", transliterasi: "Blūtū", indo: "Pluto", inggris: "Pluto", definisi: "Planet kerdil di sabuk Kuiper, dulunya planet ke-9.", link: "https://id.wikipedia.org/wiki/Pluto", huruf: "P", hurufHijaiyah: "ب" },
    { id: 410, arab: "الدليلان", transliterasi: "ad-Dalīlān", indo: "Penunjuk", inggris: "Pointers", definisi: "Dua bintang yang menunjuk ke Bintang Kutub (Ursa Major).", link: "https://en.wikipedia.org/wiki/Pointers_(stars)", huruf: "P", hurufHijaiyah: "د" },
    { id: 411, arab: "الخوافق", transliterasi: "al-Khawāfiq", indo: "Mata Angin", inggris: "Points of Compass", definisi: "Arah-arah utama pada kompas yang ditentukan dari posisi langit.", link: "https://id.wikipedia.org/wiki/Mata_angin", huruf: "M", hurufHijaiyah: "خ" },
    { id: 412, arab: "نجم القطب", transliterasi: "Najm al-Quṭb", indo: "Bintang Kutub", inggris: "Polaris", definisi: "Bintang terang di dekat kutub utara langit.", link: "https://id.wikipedia.org/wiki/Polaris", huruf: "B", hurufHijaiyah: "ن" },
    { id: 413, arab: "البعد القطبي", transliterasi: "al-Bu'd al-Quṭbī", indo: "Jarak Kutub", inggris: "Polar distance", definisi: "Jarak sudut suatu benda langit dari kutub langit.", link: "https://en.wikipedia.org/wiki/Polar_distance", huruf: "J", hurufHijaiyah: "ب" },
    { id: 414, arab: "القطب", transliterasi: "al-Quṭb", indo: "Kutub", inggris: "Pole", definisi: "Titik poros rotasi benda langit (misal Bumi).", link: "https://id.wikipedia.org/wiki/Kutub", huruf: "K", hurufHijaiyah: "ق" },
    { id: 415, arab: "رأس التوأم المؤخر", transliterasi: "Ra's at-Taw'am al-Mu'akhkhar", indo: "Pollux", inggris: "Pollux", definisi: "Bintang raksasa oranye di rasi Gemini.", link: "https://id.wikipedia.org/wiki/Pollux_(bintang)", huruf: "P", hurufHijaiyah: "ر" },
    { id: 416, arab: "زاوية العوَّاء", transliterasi: "Zāwiyat al-'Awwā'", indo: "Porrima", inggris: "Porrima", definisi: "Bintang biner di rasi Virgo.", link: "https://en.wikipedia.org/wiki/Gamma_Virginis", huruf: "P", hurufHijaiyah: "ز" },
    { id: 417, arab: "النثرة", transliterasi: "an-Nathrah", indo: "Praesepe", inggris: "Praesepe", definisi: "Gugus bintang terbuka di rasi Cancer (Kandang Lebah).", link: "https://id.wikipedia.org/wiki/M44", huruf: "P", hurufHijaiyah: "ن" },
    { id: 418, arab: "مبادرة الاعتدالين", transliterasi: "Mubādarat al-I'tidālān", indo: "Presesi Ekuinoks", inggris: "Precession of the Equinoxes", definisi: "Gerakan lambat sumbu rotasi Bumi selama 26.000 tahun.", link: "https://id.wikipedia.org/wiki/Presesi", huruf: "P", hurufHijaiyah: "م" },
    { id: 419, arab: "اوَّل", transliterasi: "Awwal", indo: "Utama", inggris: "Prime", definisi: "Yang pertama atau utama, misalnya meridian utama.", link: "https://en.wikipedia.org/wiki/Prime_(symbol)", huruf: "U", hurufHijaiyah: "ا" },
    { id: 420, arab: "المتسامتة الاولى", transliterasi: "al-Mutasāmitah al-Ulā", indo: "Vertikal Utama", inggris: "Prime Vertical", definisi: "Lingkaran vertikal yang tegak lurus meridian di suatu tempat.", link: "https://en.wikipedia.org/wiki/Prime_vertical", huruf: "V", hurufHijaiyah: "م" },
    { id: 421, arab: "الشعرى الشامية", transliterasi: "ash-Shi'rā ash-Shāmiyyah", indo: "Procyon", inggris: "Procyon", definisi: "Bintang tercerah di rasi Canis Minor.", link: "https://id.wikipedia.org/wiki/Procyon", huruf: "P", hurufHijaiyah: "ش" },
    { id: 422, arab: "المشاعيل", transliterasi: "al-Mashā'īl", indo: "Tonjolan Matahari", inggris: "Prominences", definisi: "Awan gas besar di atmosfer Matahari yang memanjang.", link: "https://id.wikipedia.org/wiki/Prominensa", huruf: "T", hurufHijaiyah: "م" },
    { id: 423, arab: "الرجل المتقدمة", transliterasi: "ar-Rijl al-Mutaqaddimah", indo: "Propus", inggris: "Propus", definisi: "Bintang ganda di rasi Gemini.", link: "https://en.wikipedia.org/wiki/Propus_(star)", huruf: "P", hurufHijaiyah: "ر" },
    { id: 424, arab: "أقرب نجم", transliterasi: "Aqrab Najm", indo: "Bintang Terdekat", inggris: "Proxima", definisi: "Bintang terdekat dengan tata surya (Proxima Centauri).", link: "https://id.wikipedia.org/wiki/Proxima_Centauri", huruf: "B", hurufHijaiyah: "ا" },
    { id: 425, arab: "الإزار", transliterasi: "al-Izār", indo: "Izar", inggris: "Pulcherima", definisi: "Bintang di rasi Boötes (juga disebut Pulcherrima).", link: "https://id.wikipedia.org/wiki/Izar", huruf: "I", hurufHijaiyah: "ا" },
    { id: 426, arab: "النجم النابض", transliterasi: "an-Najm an-Nābiḍ", indo: "Pulsar", inggris: "Pulsar", definisi: "Bintang neutron berputar cepat yang memancarkan sinar periodik.", link: "https://id.wikipedia.org/wiki/Pulsar", huruf: "P", hurufHijaiyah: "ن" },
    { id: 427, arab: "الكوثَل", transliterasi: "al-Kawṡal", indo: "Puppis", inggris: "Puppis", definisi: "Rasi bintang buritan kapal (Argo Navis) di langit selatan.", link: "https://id.wikipedia.org/wiki/Puppis_(rasi_bintang)", huruf: "P", hurufHijaiyah: "ك" },

// Entri Huruf Q
    { id: 428, arab: "ربع الدائرة", transliterasi: "Rub' ad-Dā'irah", indo: "Kuadran", inggris: "Quadrant", definisi: "Seperempat lingkaran langit atau alat ukur sudut astronomi.", link: "https://id.wikipedia.org/wiki/Kuadran_(instrumen)", huruf: "K", hurufHijaiyah: "ر" },
    { id: 429, arab: "التربيع", transliterasi: "at-Tarbī'", indo: "Kuadratur", inggris: "Quadrature", definisi: "Posisi Bulan atau planet saat membentuk sudut 90° dengan Matahari.", link: "https://id.wikipedia.org/wiki/Kuadratur_(astronomi)", huruf: "K", hurufHijaiyah: "ت" },
    { id: 430, arab: "الكمّ", transliterasi: "al-Kamm", indo: "Kuantum", inggris: "Quantum", definisi: "Jumlah terkecil energi atau besaran fisika diskret.", link: "https://id.wikipedia.org/wiki/Kuantum", huruf: "K", hurufHijaiyah: "ك" },
    { id: 431, arab: "الربع الاول", transliterasi: "ar-Rabu' al-Awwal", indo: "Kuartal Pertama", inggris: "Quarter first", definisi: "Fase Bulan saat setengah piringan terang (kuartal pertama).", link: "https://id.wikipedia.org/wiki/Fase_Bulan#Kuartal_pertama", huruf: "K", hurufHijaiyah: "ر" },
    { id: 432, arab: "الربع الأخير", transliterasi: "ar-Rabu' al-Akhīr", indo: "Kuartal Akhir", inggris: "Quarter last", definisi: "Fase Bulan saat setengah piringan terang (kuartal terakhir).", link: "https://id.wikipedia.org/wiki/Fase_Bulan#Kuartal_ketiga", huruf: "K", hurufHijaiyah: "ر" },
    { id: 433, arab: "كوازار", transliterasi: "Kuwāzār", indo: "Quasar", inggris: "Quasar", definisi: "Inti galaksi aktif sangat terang di alam semesta jauh.", link: "https://id.wikipedia.org/wiki/Kuasar", huruf: "Q", hurufHijaiyah: "ك" },

// Entri Huruf R
    { id: 434, arab: "نصف القطر الحامل", transliterasi: "Niṣf al-Qaṭr al-Ḥāmil", indo: "Vektor Radius", inggris: "Radius Vector", definisi: "Garis dari pusat gravitasi ke posisi benda langit.", link: "https://id.wikipedia.org/wiki/Vektor_posisi", huruf: "V", hurufHijaiyah: "ن" },
    { id: 435, arab: "الزاوية الشعاعية", transliterasi: "az-Zāwiyah ash-Shu'ā'iyyah", indo: "Radian", inggris: "Radian", definisi: "Satuan sudut berdasarkan jari-jari lingkaran.", link: "https://id.wikipedia.org/wiki/Radian", huruf: "R", hurufHijaiyah: "ز" },
    { id: 436, arab: "قوس قزح", transliterasi: "Qaws Quzaḥ", indo: "Pelangi", inggris: "Rainbow", definisi: "Fenomena optik berupa spektrum warna di langit.", link: "https://id.wikipedia.org/wiki/Pelangi", huruf: "P", hurufHijaiyah: "ق" },
    { id: 437, arab: "ملطَّف", transliterasi: "Mulaṭṭaf", indo: "Ringan/Menipis", inggris: "Rarified", definisi: "Udara atau gas yang sangat tipis di atmosfer tinggi.", link: "https://id.wikipedia.org/wiki/Atmosfer", huruf: "R", hurufHijaiyah: "م" },
    { id: 438, arab: "رأس الحواء", transliterasi: "Ra's al-Ḥawwā'", indo: "Rasalhague", inggris: "Rasalhague", definisi: "Bintang tercerah di rasi Ophiuchus.", link: "https://id.wikipedia.org/wiki/Rasalhague", huruf: "R", hurufHijaiyah: "ر" },
    { id: 439, arab: "الافق الحقيقي", transliterasi: "al-Ufuq al-Ḥaqīqī", indo: "Horizon Rasional", inggris: "Rational horizon", definisi: "Lingkaran besar yang tegak lurus garis vertikal pengamat.", link: "https://en.wikipedia.org/wiki/Horizon", huruf: "H", hurufHijaiyah: "ا" },
    { id: 440, arab: "الروضة", transliterasi: "ar-Rawḍah", indo: "Raudah", inggris: "Raudah", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Delta_Pegasi", huruf: "R", hurufHijaiyah: "ر" },
    { id: 441, arab: "العملاق الأحمر", transliterasi: "al-'Amalāq al-Aḥmar", indo: "Raksasa Merah", inggris: "Red Giant", definisi: "Bintang raksasa yang membesar dan berwarna kemerahan di akhir hidupnya.", link: "https://id.wikipedia.org/wiki/Raksasa_merah", huruf: "R", hurufHijaiyah: "ع" },
    { id: 442, arab: "النجوم الحمراء", transliterasi: "an-Nujūm al-Ḥamrā'", indo: "Bintang Merah", inggris: "Red Stars", definisi: "Bintang dengan suhu rendah yang memancarkan cahaya merah.", link: "https://id.wikipedia.org/wiki/Bintang", huruf: "B", hurufHijaiyah: "ن" },
    { id: 443, arab: "نظَّارة عاكسة", transliterasi: "Naẓẓārah 'Ākisah", indo: "Teleskop Pantul", inggris: "Reflecting telescope", definisi: "Teleskop yang menggunakan cermin untuk mengumpulkan cahaya.", link: "https://id.wikipedia.org/wiki/Teleskop_pantul", huruf: "T", hurufHijaiyah: "ن" },
    { id: 444, arab: "نظَّارة مكسرة", transliterasi: "Naẓẓārah Maksarah", indo: "Teleskop Bias", inggris: "Refracting telescope", definisi: "Teleskop yang menggunakan lensa untuk membelokkan cahaya.", link: "https://id.wikipedia.org/wiki/Teleskop_bias", huruf: "T", hurufHijaiyah: "ن" },
    { id: 445, arab: "الانكسار", transliterasi: "al-Inkisār", indo: "Refraksi", inggris: "Refraction", definisi: "Pembelokan cahaya saat melewati medium yang berbeda.", link: "https://id.wikipedia.org/wiki/Refraksi", huruf: "R", hurufHijaiyah: "ا" },
    { id: 446, arab: "رجل الجبار اليسرى", transliterasi: "Rijl al-Jabbār al-Yusrā", indo: "Regel/Rigel", inggris: "Regel & Rigel", definisi: "Bintang raksasa biru di rasi Orion (kaki kiri).", link: "https://id.wikipedia.org/wiki/Rigel", huruf: "R", hurufHijaiyah: "ر" },
    { id: 447, arab: "تقهقر", transliterasi: "Taqahqur", indo: "Regresi", inggris: "Regression", definisi: "Gerakan mundur atau penurunan posisi benda langit.", link: "https://id.wikipedia.org/wiki/Regresi_(astronomi)", huruf: "R", hurufHijaiyah: "ت" },
    { id: 448, arab: "قلب الأسد", transliterasi: "Qalb al-Asad", indo: "Regulus", inggris: "Regulus", definisi: "Bintang tercerah di rasi Leo.", link: "https://id.wikipedia.org/wiki/Regulus", huruf: "R", hurufHijaiyah: "ق" },
    { id: 449, arab: "النسبية", transliterasi: "an-Nisbiyyah", indo: "Relativitas", inggris: "Relativity", definisi: "Teori fisika tentang ruang-waktu dan gravitasi (Einstein).", link: "https://id.wikipedia.org/wiki/Relativitas", huruf: "R", hurufHijaiyah: "ن" },
    { id: 450, arab: "الثَبَكة", transliterasi: "ath-Thabakah", indo: "Reticulum", inggris: "Reticulum", definisi: "Rasi bintang kecil di langit selatan.", link: "https://id.wikipedia.org/wiki/Reticulum_(rasi_bintang)", huruf: "R", hurufHijaiyah: "ث" },
    { id: 451, arab: "تراجع", transliterasi: "Tarāju'", indo: "Retrogresi", inggris: "Retrogression", definisi: "Gerakan mundur planet dari timur ke barat.", link: "https://id.wikipedia.org/wiki/Gerak_retrograd", huruf: "R", hurufHijaiyah: "ت" },
    { id: 452, arab: "الطبقة العاكسة", transliterasi: "aṭ-Ṭabaqah al-'Ākisah", indo: "Lapisan Balik", inggris: "Reversing layer", definisi: "Lapisan atmosfer Matahari yang menyerap spektrum cahaya.", link: "https://en.wikipedia.org/wiki/Reversing_layer", huruf: "L", hurufHijaiyah: "ط" },
    { id: 453, arab: "الدوران", transliterasi: "ad-Dawrān", indo: "Revolusi", inggris: "Revolution", definisi: "Gerakan mengelilingi pusat massa atau bintang.", link: "https://id.wikipedia.org/wiki/Revolusi", huruf: "R", hurufHijaiyah: "د" },
    { id: 454, arab: "الشقوق", transliterasi: "ash-Shuqūq", indo: "Retakan", inggris: "Rifts", definisi: "Celah atau patahan di permukaan benda langit.", link: "https://id.wikipedia.org/wiki/Retakan", huruf: "R", hurufHijaiyah: "ش" },
    { id: 455, arab: "الصعود المستقيم", transliterasi: "aṣ-Ṣu'ūd al-Mustaqīm", indo: "Asensio Rekta", inggris: "Right Ascension", definisi: "Koordinat langit yang setara dengan bujur di Bumi.", link: "https://id.wikipedia.org/wiki/Asensio_rekta", huruf: "A", hurufHijaiyah: "ص" },
    { id: 456, arab: "حلقات زُحَل", transliterasi: "Ḥalaqāt Zuḥal", indo: "Cincin Saturnus", inggris: "Rings of Saturn", definisi: "Sistem cincin es dan debu yang mengelilingi planet Saturnus.", link: "https://id.wikipedia.org/wiki/Cincin_Saturnus", huruf: "C", hurufHijaiyah: "ح" },
    { id: 457, arab: "الشروق", transliterasi: "ash-Shurūq", indo: "Terbit", inggris: "Rising", definisi: "Saat benda langit muncul di atas horizon.", link: "https://id.wikipedia.org/wiki/Terbit", huruf: "T", hurufHijaiyah: "ش" },
    { id: 458, arab: "صاروخ", transliterasi: "Ṣārūkh", indo: "Roket", inggris: "Rocket", definisi: "Kendaraan luar angkasa yang menggunakan dorongan gas.", link: "https://id.wikipedia.org/wiki/Roket", huruf: "R", hurufHijaiyah: "ص" },
    { id: 459, arab: "ثاني الدلفين", transliterasi: "Thānī ad-Dulfīn", indo: "Rotanev", inggris: "Rotanev", definisi: "Bintang di rasi Delphinus.", link: "https://en.wikipedia.org/wiki/Beta_Delphini", huruf: "R", hurufHijaiyah: "ث" },
    { id: 460, arab: "الدوران على المحور", transliterasi: "ad-Dawrān 'alā al-Miḥwar", indo: "Rotasi", inggris: "Rotation", definisi: "Perputaran benda langit pada sumbunya sendiri.", link: "https://id.wikipedia.org/wiki/Rotasi", huruf: "R", hurufHijaiyah: "د" },
    { id: 461, arab: "المركبة الجوالة", transliterasi: "al-Markabah al-Jawwālah", indo: "Rover", inggris: "Rover", definisi: "Kendaraan penjelajah permukaan planet atau Bulan.", link: "https://id.wikipedia.org/wiki/Rover", huruf: "R", hurufHijaiyah: "م" },

// Entri Huruf S
    { id: 462, arab: "السابق الثاني", transliterasi: "as-Sābiq ath-Thānī", indo: "Sabik", inggris: "Sabik", definisi: "Bintang di rasi Ophiuchus.", link: "https://en.wikipedia.org/wiki/Sabik", huruf: "S", hurufHijaiyah: "س" },
    { id: 463, arab: "السخلتان", transliterasi: "as-Sakhlatān", indo: "Soclatein", inggris: "Soclatein", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/List_of_Arabic_star_names", huruf: "S", hurufHijaiyah: "س" },
    { id: 464, arab: "الساعد الثاني", transliterasi: "as-Sā'id ath-Thānī", indo: "Sadatoni", inggris: "Sadatoni", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/List_of_Arabic_star_names", huruf: "S", hurufHijaiyah: "س" },
    { id: 465, arab: "صَدر الدَجاجة", transliterasi: "Ṣadr ad-Dajājah", indo: "Sadr", inggris: "Sadr", definisi: "Bintang tercerah di rasi Cygnus (dada ayam).", link: "https://id.wikipedia.org/wiki/Sadr", huruf: "S", hurufHijaiyah: "ص" },
    { id: 466, arab: "السفينة", transliterasi: "as-Safīnah", indo: "Safinah", inggris: "Safinah", definisi: "Nama bintang dalam astronomi Arab (Kapal).", link: "https://en.wikipedia.org/wiki/List_of_Arabic_star_names", huruf: "S", hurufHijaiyah: "س" },
    { id: 467, arab: "السَهم", transliterasi: "as-Sahm", indo: "Sagitta", inggris: "Sagitta", definisi: "Rasi bintang panah di langit utara.", link: "https://id.wikipedia.org/wiki/Sagitta_(rasi_bintang)", huruf: "S", hurufHijaiyah: "س" },
    { id: 468, arab: "القوس", transliterasi: "al-Qaws", indo: "Sagittarius", inggris: "Sagittarius", definisi: "Rasi zodiak kesembilan (pemanah).", link: "https://id.wikipedia.org/wiki/Sagittarius_(rasi_bintang)", huruf: "S", hurufHijaiyah: "ق" },
    { id: 469, arab: "اقمار", transliterasi: "Aqmār", indo: "Satelit", inggris: "Satellites", definisi: "Benda langit yang mengorbit planet atau benda lain.", link: "https://id.wikipedia.org/wiki/Satelit", huruf: "S", hurufHijaiyah: "ا" },
    { id: 470, arab: "زُحَل", transliterasi: "Zuḥal", indo: "Saturnus", inggris: "Saturn", definisi: "Planet bercincin terbesar kedua di tata surya.", link: "https://id.wikipedia.org/wiki/Saturnus", huruf: "S", hurufHijaiyah: "ز" },
    { id: 471, arab: "العقرب", transliterasi: "al-'Aqrab", indo: "Scorpio", inggris: "Scorpio", definisi: "Rasi zodiak kedelapan (kalajengking).", link: "https://id.wikipedia.org/wiki/Scorpius", huruf: "S", hurufHijaiyah: "ع" },
    { id: 472, arab: "آلة النقاش", transliterasi: "Ālah an-Naqqāsh", indo: "Sculptor", inggris: "Sculptor", definisi: "Rasi bintang kecil di selatan (pematung).", link: "https://id.wikipedia.org/wiki/Sculptor_(rasi_bintang)", huruf: "S", hurufHijaiyah: "آ" },
    { id: 473, arab: "الفصول", transliterasi: "al-Fuṣūl", indo: "Musim", inggris: "Seasons", definisi: "Empat periode tahun akibat kemiringan sumbu Bumi.", link: "https://id.wikipedia.org/wiki/Musim", huruf: "M", hurufHijaiyah: "ف" },
    { id: 474, arab: "جيلي", transliterasi: "Jīlī", indo: "Sekuler", inggris: "Secular", definisi: "Perubahan yang terjadi dalam jangka waktu sangat panjang.", link: "https://en.wikipedia.org/wiki/Secular_variation", huruf: "S", hurufHijaiyah: "ج" },
    { id: 475, arab: "سلنوغرافيا", transliterasi: "Salnūghrāfiyā", indo: "Selenografi", inggris: "Selenography", definisi: "Ilmu pemetaan permukaan Bulan.", link: "https://id.wikipedia.org/wiki/Selenografi", huruf: "S", hurufHijaiyah: "س" },
    { id: 476, arab: "الحيَّة", transliterasi: "al-Ḥayyah", indo: "Serpens", inggris: "Serpens", definisi: "Rasi ular yang terbagi menjadi dua bagian.", link: "https://id.wikipedia.org/wiki/Serpens_(rasi_bintang)", huruf: "S", hurufHijaiyah: "ح" },
    { id: 477, arab: "النصف القطر", transliterasi: "an-Niṣf al-Qaṭr", indo: "Semi-diameter", inggris: "Semi diameter", definisi: "Setengah dari diameter benda langit.", link: "https://id.wikipedia.org/wiki/Jari-jari", huruf: "S", hurufHijaiyah: "ن" },
    { id: 478, arab: "الغروب", transliterasi: "al-Ghurūb", indo: "Terbenam", inggris: "Setting", definisi: "Saat benda langit turun di bawah horizon.", link: "https://id.wikipedia.org/wiki/Matahari_terbenam", huruf: "T", hurufHijaiyah: "غ" },
    { id: 479, arab: "الظلّ", transliterasi: "aẓ-Ẓill", indo: "Bayangan", inggris: "Shadow", definisi: "Daerah gelap akibat terhalangnya cahaya.", link: "https://id.wikipedia.org/wiki/Bayangan", huruf: "B", hurufHijaiyah: "ظ" },
    { id: 480, arab: "حيود", transliterasi: "Ḥayūd", indo: "Pergeseran", inggris: "Shift", definisi: "Perubahan posisi spektrum akibat efek Doppler.", link: "https://en.wikipedia.org/wiki/Redshift", huruf: "P", hurufHijaiyah: "ح" },
    { id: 481, arab: "الشُهُب", transliterasi: "ash-Shuhub", indo: "Meteor", inggris: "Shooting stars", definisi: "Meteor yang terbakar saat memasuki atmosfer.", link: "https://id.wikipedia.org/wiki/Meteor", huruf: "M", hurufHijaiyah: "ش" },
    { id: 482, arab: "نَجوميّ", transliterasi: "Najūmī", indo: "Sideris", inggris: "Sidereal", definisi: "Berhubungan dengan bintang atau posisi bintang.", link: "https://id.wikipedia.org/wiki/Sideris", huruf: "S", hurufHijaiyah: "ن" },
    { id: 483, arab: "الحجارة النجومية", transliterasi: "al-Ḥijārah an-Nujūmiyyah", indo: "Siderit", inggris: "Siderites", definisi: "Meteorit yang mengandung unsur besi-nikel.", link: "https://en.wikipedia.org/wiki/Iron_meteorite", huruf: "S", hurufHijaiyah: "ح" },
    { id: 484, arab: "الحجارة النيزكية", transliterasi: "al-Ḥijārah an-Nayzakiyyah", indo: "Siderolit", inggris: "Siderolites", definisi: "Meteorit batuan yang mengandung mineral silikat.", link: "https://en.wikipedia.org/wiki/Stony-iron_meteorite", huruf: "S", hurufHijaiyah: "ح" },
    { id: 485, arab: "البروج", transliterasi: "al-Burūj", indo: "Zodiak", inggris: "Signs of the Zodiac", definisi: "12 rasi bintang di sepanjang ekliptika.", link: "https://id.wikipedia.org/wiki/Zodiak", huruf: "Z", hurufHijaiyah: "ب" },
    { id: 486, arab: "الشِّعرى", transliterasi: "ash-Shi'rā", indo: "Sirius", inggris: "Sirius", definisi: "Bintang tercerah di langit malam.", link: "https://id.wikipedia.org/wiki/Sirius", huruf: "S", hurufHijaiyah: "ش" },
    { id: 487, arab: "السماء", transliterasi: "as-Samā'", indo: "Langit", inggris: "Sky", definisi: "Ruang di atas permukaan Bumi yang terlihat.", link: "https://id.wikipedia.org/wiki/Langit", huruf: "L", hurufHijaiyah: "س" },
    { id: 488, arab: "دائرة صغيرة", transliterasi: "Dā'irah Ṣaghīrah", indo: "Lingkaran Kecil", inggris: "Small circle", definisi: "Lingkaran di permukaan bola yang tidak membagi dua.", link: "https://en.wikipedia.org/wiki/Small_circle", huruf: "L", hurufHijaiyah: "د" },
    { id: 489, arab: "شمسيّ", transliterasi: "Shamsī", indo: "Matahari (solar)", inggris: "Solar", definisi: "Berhubungan dengan Matahari.", link: "https://id.wikipedia.org/wiki/Matahari", huruf: "S", hurufHijaiyah: "ش" },
    { id: 490, arab: "التوهج الشمسي", transliterasi: "at-Tawahhuj ash-Shamsī", indo: "Suar Matahari", inggris: "Solar Flare", definisi: "Ledakan energi besar di permukaan Matahari.", link: "https://id.wikipedia.org/wiki/Suar_matahari", huruf: "S", hurufHijaiyah: "ت" },
    { id: 491, arab: "النظام الشمسي", transliterasi: "an-Niẓām ash-Shamsī", indo: "Tata Surya", inggris: "Solar system", definisi: "Sistem yang terdiri dari Matahari dan benda-benda yang mengorbitnya.", link: "https://id.wikipedia.org/wiki/Tata_Surya", huruf: "T", hurufHijaiyah: "ن" },
    { id: 492, arab: "الرياح الشمسية", transliterasi: "ar-Riyāḥ ash-Shamsiyyah", indo: "Angin Matahari", inggris: "Solar Wind", definisi: "Aliran partikel bermuatan dari Matahari.", link: "https://id.wikipedia.org/wiki/Angin_matahari", huruf: "A", hurufHijaiyah: "ر" },
    { id: 493, arab: "المـُـنْقَلَب", transliterasi: "al-Munqalab", indo: "Titik Balik", inggris: "Solstice", definisi: "Titik saat Matahari berada di deklinasi maksimum.", link: "https://id.wikipedia.org/wiki/Titik_balik", huruf: "T", hurufHijaiyah: "م" },
    { id: 494, arab: "الفضاء", transliterasi: "al-Faḍā'", indo: "Luar Angkasa", inggris: "Space", definisi: "Ruang di luar atmosfer Bumi.", link: "https://id.wikipedia.org/wiki/Luar_angkasa", huruf: "L", hurufHijaiyah: "ف" },
    { id: 495, arab: "المركبة الفضائية", transliterasi: "al-Markabah al-Faḍā'iyyah", indo: "Pesawat Antariksa", inggris: "Spacecraft", definisi: "Kendaraan yang dirancang untuk beroperasi di luar angkasa.", link: "https://id.wikipedia.org/wiki/Pesawat_antariksa", huruf: "P", hurufHijaiyah: "م" },
    { id: 496, arab: "الحطام الفضائي", transliterasi: "al-Ḥuṭām al-Faḍā'ī", indo: "Sampah Antariksa", inggris: "Space Debris", definisi: "Objek buatan yang mengorbit Bumi tanpa fungsi.", link: "https://id.wikipedia.org/wiki/Sampah_antariksa", huruf: "S", hurufHijaiyah: "ح" },
    { id: 497, arab: "مسبار فضائي", transliterasi: "Mishbār Faḍā'ī", indo: "Penjelajah Antariksa", inggris: "Space Probe", definisi: "Pesawat nirawak untuk eksplorasi antariksa.", link: "https://id.wikipedia.org/wiki/Wahana_antariksa", huruf: "P", hurufHijaiyah: "م" },
    { id: 498, arab: "المحطة الفضائية", transliterasi: "al-Maḥaṭṭah al-Faḍā'iyyah", indo: "Stasiun Antariksa", inggris: "Space Station", definisi: "Struktur besar untuk tinggal dan bekerja di orbit.", link: "https://id.wikipedia.org/wiki/Stasiun_luar_angkasa", huruf: "S", hurufHijaiyah: "م" },
    { id: 499, arab: "التلسكوب الفضائي", transliterasi: "at-Tiliskūb al-Faḍā'ī", indo: "Teleskop Antariksa", inggris: "Space Telescope", definisi: "Teleskop yang ditempatkan di luar atmosfer Bumi.", link: "https://id.wikipedia.org/wiki/Teleskop_luar_angkasa", huruf: "T", hurufHijaiyah: "ت" },
    { id: 500, arab: "طقس الفضاء", transliterasi: "Ṭaqs al-Faḍā'", indo: "Cuaca Antariksa", inggris: "Space Weather", definisi: "Kondisi lingkungan antariksa yang dipengaruhi aktivitas Matahari.", link: "https://id.wikipedia.org/wiki/Cuaca_antariksa", huruf: "C", hurufHijaiyah: "ط" },
    { id: 501, arab: "يتألّق", transliterasi: "Yata'allaq", indo: "Berkilau", inggris: "Sparkle", definisi: "Cahaya gemerlap dari bintang atau objek langit.", link: "https://en.wikipedia.org/wiki/Twinkling", huruf: "B", hurufHijaiyah: "ي" },
    { id: 502, arab: "السبكتروسكوب", transliterasi: "as-Sabkitrūskūb", indo: "Spektroskop", inggris: "Spectroscope", definisi: "Alat untuk mengurai cahaya menjadi spektrum.", link: "https://id.wikipedia.org/wiki/Spektroskop", huruf: "S", hurufHijaiyah: "س" },
    { id: 503, arab: "طَيْف", transliterasi: "Ṭayf", indo: "Spektrum", inggris: "Spectrum", definisi: "Pita warna hasil penguraian cahaya.", link: "https://id.wikipedia.org/wiki/Spektrum", huruf: "S", hurufHijaiyah: "ط" },
    { id: 504, arab: "كُرَة", transliterasi: "Kurah", indo: "Bola", inggris: "Sphere", definisi: "Bentuk bulat sempurna seperti Bumi atau Matahari.", link: "https://id.wikipedia.org/wiki/Bola_(geometri)", huruf: "B", hurufHijaiyah: "ك" },
    { id: 505, arab: "علم الهيئة الكروي", transliterasi: "'Ilm al-Hay'ah al-Kurī", indo: "Astronomi Bola", inggris: "Spherical astronomy", definisi: "Cabang astronomi tentang posisi benda langit di bola langit.", link: "https://id.wikipedia.org/wiki/Astronomi_bola", huruf: "A", hurufHijaiyah: "ع" },
    { id: 506, arab: "شبه كرة", transliterasi: "Shabah Kurah", indo: "Sferoid", inggris: "Spheroid", definisi: "Bentuk yang menyerupai bola namun sedikit pipih.", link: "https://id.wikipedia.org/wiki/Sferoid", huruf: "S", hurufHijaiyah: "ش" },
    { id: 507, arab: "السماك الأعزل", transliterasi: "as-Simāk al-A'zal", indo: "Spica", inggris: "Spica", definisi: "Bintang tercerah di rasi Virgo.", link: "https://id.wikipedia.org/wiki/Spica", huruf: "S", hurufHijaiyah: "س" },
    { id: 508, arab: "ثبات", transliterasi: "Thabāt", indo: "Stabilitas", inggris: "Stability", definisi: "Kemampuan orbit atau sistem tetap dalam keseimbangan.", link: "https://id.wikipedia.org/wiki/Stabilitas", huruf: "S", hurufHijaiyah: "ث" },
    { id: 509, arab: "الوقت النظامي", transliterasi: "al-Waqt an-Niẓāmī", indo: "Waktu Standar", inggris: "Standard time", definisi: "Waktu yang disepakati untuk suatu zona waktu.", link: "https://id.wikipedia.org/wiki/Waktu_standar", huruf: "W", hurufHijaiyah: "و" },
    { id: 510, arab: "نجم", transliterasi: "Najm", indo: "Bintang", inggris: "Star", definisi: "Bola gas pijar yang menghasilkan cahaya sendiri.", link: "https://id.wikipedia.org/wiki/Bintang", huruf: "B", hurufHijaiyah: "ن" },
    { id: 511, arab: "مجموعة النجوم", transliterasi: "Majmū'ah an-Nujūm", indo: "Gugus Bintang", inggris: "Star Cluster", definisi: "Kumpulan bintang yang terikat gravitasi.", link: "https://id.wikipedia.org/wiki/Gugus_bintang", huruf: "G", hurufHijaiyah: "م" },
    { id: 512, arab: "النجوم", transliterasi: "an-Nujūm", indo: "Bintang-bintang", inggris: "Stars", definisi: "Bentuk jamak dari bintang di alam semesta.", link: "https://id.wikipedia.org/wiki/Bintang", huruf: "B", hurufHijaiyah: "ن" },
    { id: 513, arab: "مستقر", transliterasi: "Mustaqir", indo: "Stasioner", inggris: "Stationary", definisi: "Benda langit yang tampak tidak bergerak dalam jangka waktu tertentu.", link: "https://en.wikipedia.org/wiki/Stationary_point_(astronomy)", huruf: "S", hurufHijaiyah: "م" },
    { id: 514, arab: "شكل الكون الشمسي", transliterasi: "Shakl al-Kawn ash-Shamsī", indo: "Struktur Alam Semesta", inggris: "Structure of stellar universe", definisi: "Susunan galaksi dan bintang di alam semesta.", link: "https://en.wikipedia.org/wiki/Large-scale_structure_of_the_universe", huruf: "S", hurufHijaiyah: "ش" },
    { id: 515, arab: "ذريرية", transliterasi: "Dharrīriyyah", indo: "Subatomik", inggris: "Subatomic", definisi: "Partikel yang lebih kecil dari atom, seperti elektron.", link: "https://id.wikipedia.org/wiki/Subatom", huruf: "S", hurufHijaiyah: "ذ" },
    { id: 516, arab: "الشمس", transliterasi: "ash-Shams", indo: "Matahari", inggris: "Sun", definisi: "Bintang pusat tata surya.", link: "https://id.wikipedia.org/wiki/Matahari", huruf: "M", hurufHijaiyah: "ش" },
    { id: 517, arab: "المِـزولة", transliterasi: "al-Mizwalah", indo: "Jam Matahari", inggris: "Sundial", definisi: "Alat penunjuk waktu berdasarkan bayangan Matahari.", link: "https://id.wikipedia.org/wiki/Jam_matahari", huruf: "J", hurufHijaiyah: "م" },
    { id: 518, arab: "كُلَف الشَمس", transliterasi: "Kulaf ash-Shams", indo: "Bintik Matahari", inggris: "Sun-spots", definisi: "Bintik gelap di permukaan Matahari akibat aktivitas magnetik.", link: "https://id.wikipedia.org/wiki/Bintik_matahari", huruf: "B", hurufHijaiyah: "ك" },
    { id: 519, arab: "الاقتران العلوي", transliterasi: "al-Iqtirān al-'Alawī", indo: "Konjungsi Superior", inggris: "Superior conjunction", definisi: "Konjungsi dengan Matahari saat planet di sisi jauh.", link: "https://id.wikipedia.org/wiki/Konjungsi_(astronomi)#Konjungsi_superior", huruf: "K", hurufHijaiyah: "ا" },
    { id: 520, arab: "السيارات العليا", transliterasi: "as-Sayyārāt al-'Ulyā", indo: "Planet Superior", inggris: "Superior planets", definisi: "Planet dengan orbit di luar orbit Bumi (Mars hingga Neptunus).", link: "https://en.wikipedia.org/wiki/Superior_planet", huruf: "P", hurufHijaiyah: "س" },
    { id: 521, arab: "مستعر أعظم", transliterasi: "Must'ir A'ẓam", indo: "Supernova", inggris: "Supernova", definisi: "Ledakan dahsyat yang mengakhiri hidup bintang masif.", link: "https://id.wikipedia.org/wiki/Supernova", huruf: "S", hurufHijaiyah: "م" },
    { id: 522, arab: "الشهر الاقتراني", transliterasi: "ash-Shahr al-Iqtirānī", indo: "Bulan Sinodis", inggris: "Synodic month", definisi: "Periode dari satu fase Bulan ke fase yang sama (~29,5 hari).", link: "https://id.wikipedia.org/wiki/Bulan_sinodis", huruf: "B", hurufHijaiyah: "ش" },
    { id: 523, arab: "الدورة الاقترانية", transliterasi: "ad-Dawrah al-Iqtirāniyyah", indo: "Periode Sinodis", inggris: "Synodic period", definisi: "Waktu antara dua konjungsi berturut-turut suatu planet.", link: "https://id.wikipedia.org/wiki/Periode_sinodis", huruf: "P", hurufHijaiyah: "د" },
    { id: 524, arab: "السنة الاقترانية", transliterasi: "as-Sanah al-Iqtirāniyyah", indo: "Tahun Sinodis", inggris: "Synodic year", definisi: "Waktu antara dua konjungsi planet dengan Matahari.", link: "https://id.wikipedia.org/wiki/Tahun_sinodis", huruf: "T", hurufHijaiyah: "س" },
    { id: 525, arab: "النِظَام", transliterasi: "an-Niẓām", indo: "Sistem", inggris: "System", definisi: "Kumpulan benda langit yang saling berinteraksi.", link: "https://id.wikipedia.org/wiki/Sistem", huruf: "S", hurufHijaiyah: "ن" },
    { id: 526, arab: "اتصال", transliterasi: "Ittiṣāl", indo: "Sizigi", inggris: "Syzygy", definisi: "Konfigurasi tiga benda langit dalam satu garis lurus.", link: "https://id.wikipedia.org/wiki/Syzygy_(astronomi)", huruf: "S", hurufHijaiyah: "ا" },

// Entri Huruf T
    { id: 527, arab: "جداول", transliterasi: "Jadāwil", indo: "Tabel", inggris: "Tables", definisi: "Kumpulan data posisi benda langit untuk perhitungan.", link: "https://id.wikipedia.org/wiki/Tabel", huruf: "T", hurufHijaiyah: "ج" },
    { id: 528, arab: "ذنب المذنب", transliterasi: "Dhanab al-Mudhnab", indo: "Ekor Komet", inggris: "Tail of comets", definisi: "Jejak gas dan debu yang terbentuk di belakang komet.", link: "https://id.wikipedia.org/wiki/Komet", huruf: "E", hurufHijaiyah: "ذ" },
    { id: 529, arab: "القفزة الثالثة", transliterasi: "al-Qafzah ath-Thālithah", indo: "Talitha", inggris: "Talitha", definisi: "Bintang di rasi Ursa Major.", link: "https://en.wikipedia.org/wiki/Talitha_(star)", huruf: "T", hurufHijaiyah: "ق" },
    { id: 530, arab: "الثَوْر", transliterasi: "ath-Thawr", indo: "Taurus", inggris: "Taurus", definisi: "Rasi zodiak kedua (banteng).", link: "https://id.wikipedia.org/wiki/Taurus_(rasi_bintang)", huruf: "T", hurufHijaiyah: "ث" },
    { id: 531, arab: "تلسكوب", transliterasi: "Tiliskūb", indo: "Teleskop", inggris: "Telescope", definisi: "Alat optik untuk mengamati benda langit jauh.", link: "https://id.wikipedia.org/wiki/Teleskop", huruf: "T", hurufHijaiyah: "ت" },
    { id: 532, arab: "المرقب الفلكي", transliterasi: "al-Marqab al-Falakī", indo: "Telescopium", inggris: "Telescopium", definisi: "Rasi teleskop di langit selatan.", link: "https://id.wikipedia.org/wiki/Telescopium_(rasi_bintang)", huruf: "T", hurufHijaiyah: "م" },
    { id: 533, arab: "حرارة", transliterasi: "Ḥarārah", indo: "Suhu", inggris: "Temperature", definisi: "Tingkat panas suatu benda langit.", link: "https://id.wikipedia.org/wiki/Suhu", huruf: "S", hurufHijaiyah: "ح" },
    { id: 534, arab: "النجوم الوقتية", transliterasi: "an-Nujūm al-Waqtiyyah", indo: "Bintang Sementara", inggris: "Temporary stars", definisi: "Bintang yang muncul sementara lalu menghilang (nova).", link: "https://id.wikipedia.org/wiki/Nova", huruf: "B", hurufHijaiyah: "ن" },
    { id: 535, arab: "الحد", transliterasi: "al-Ḥadd", indo: "Terminator", inggris: "Terminator", definisi: "Garis batas antara sisi terang dan gelap planet.", link: "https://en.wikipedia.org/wiki/Terminator_(solar)", huruf: "T", hurufHijaiyah: "ح" },
    { id: 536, arab: "ثابت", transliterasi: "Thābit", indo: "Thabit", inggris: "Thabit", definisi: "Bintang di rasi Orion (delta Orionis).", link: "https://en.wikipedia.org/wiki/Thabit_(star)", huruf: "T", hurufHijaiyah: "ث" },
    { id: 537, arab: "المــَد", transliterasi: "al-Madd", indo: "Pasang", inggris: "Tide", definisi: "Naiknya permukaan laut akibat gravitasi Bulan.", link: "https://id.wikipedia.org/wiki/Pasang_surut", huruf: "P", hurufHijaiyah: "م" },
    { id: 538, arab: "المد والجزر", transliterasi: "al-Madd wa al-Jazr", indo: "Pasang Surut", inggris: "Tides", definisi: "Fenomena naik-turun air laut akibat gravitasi Bulan.", link: "https://id.wikipedia.org/wiki/Pasang_surut", huruf: "P", hurufHijaiyah: "م" },
    { id: 539, arab: "مُعادلة الوقت", transliterasi: "Mu'ādalat al-Waqt", indo: "Persamaan Waktu", inggris: "Time, equation of", definisi: "Selisih waktu matahari sejati dan rata-rata.", link: "https://id.wikipedia.org/wiki/Persamaan_waktu", huruf: "P", hurufHijaiyah: "م" },
    { id: 540, arab: "ميزان الفتل", transliterasi: "Mīzān al-Fatl", indo: "Neraca Puntir", inggris: "Torsion balance", definisi: "Alat untuk mengukur gaya gravitasi lemah.", link: "https://en.wikipedia.org/wiki/Torsion_balance", huruf: "N", hurufHijaiyah: "م" },
    { id: 541, arab: "الكسوف الكلّي والحلقيّ", transliterasi: "al-Kusūf al-Kullī wa al-Ḥalaqī", indo: "Gerhana Total & Cincin", inggris: "Total and annular eclipse", definisi: "Gerhana Matahari total atau berbentuk cincin.", link: "https://id.wikipedia.org/wiki/Gerhana_matahari", huruf: "G", hurufHijaiyah: "ك" },
    { id: 542, arab: "الطوقان", transliterasi: "aṭ-Ṭūqān", indo: "Toucan", inggris: "Toucan", definisi: "Rasi bintang di langit selatan (burung toucan).", link: "https://id.wikipedia.org/wiki/Tucana_(rasi_bintang)", huruf: "T", hurufHijaiyah: "ط" },
    { id: 543, arab: "العُبور", transliterasi: "al-'Ubūr", indo: "Transit", inggris: "Transit", definisi: "Peristiwa benda langit melintas di depan benda lain.", link: "https://id.wikipedia.org/wiki/Transit_(astronomi)", huruf: "T", hurufHijaiyah: "ع" },
    { id: 544, arab: "شفاف", transliterasi: "Shaffāf", indo: "Transparan", inggris: "Transparent", definisi: "Bersifat tembus pandang (misal atmosfer tipis).", link: "https://id.wikipedia.org/wiki/Transparansi", huruf: "T", hurufHijaiyah: "ش" },
    { id: 545, arab: "طريقة سلسلة المثلثات", transliterasi: "Ṭarīqah Silsilat al-Muthallathāt", indo: "Trigonometri", inggris: "Triangulation", definisi: "Metode pengukuran jarak dengan segitiga.", link: "https://id.wikipedia.org/wiki/Trigonometri", huruf: "T", hurufHijaiyah: "ط" },
    { id: 546, arab: "المثلث", transliterasi: "al-Muthallath", indo: "Triangulum", inggris: "Triangulum", definisi: "Rasi bintang segitiga di langit utara.", link: "https://id.wikipedia.org/wiki/Triangulum_(rasi_bintang)", huruf: "T", hurufHijaiyah: "م" },
    { id: 547, arab: "ترايتُون", transliterasi: "Trāītūn", indo: "Triton", inggris: "Triton", definisi: "Bulan terbesar Neptunus.", link: "https://id.wikipedia.org/wiki/Triton_(bulan)", huruf: "T", hurufHijaiyah: "ت" },
    { id: 548, arab: "السنة العادية", transliterasi: "as-Sanah al-'Ādiyyah", indo: "Tahun Tropis", inggris: "Tropical Year", definisi: "Waktu dari satu ekuinoks ke ekuinoks berikutnya (~365,24 hari).", link: "https://id.wikipedia.org/wiki/Tahun_tropis", huruf: "T", hurufHijaiyah: "س" },
    { id: 549, arab: "المدار", transliterasi: "al-Madār", indo: "Tropik", inggris: "Tropic", definisi: "Garis lintang di utara/selatan ekuator, 23,5°.", link: "https://id.wikipedia.org/wiki/Garis_balik", huruf: "T", hurufHijaiyah: "م" },
    { id: 550, arab: "الشفق", transliterasi: "ash-Shafaq", indo: "Senja/Awan", inggris: "Twilight", definisi: "Cahaya samar di langit saat Matahari di bawah horizon.", link: "https://id.wikipedia.org/wiki/Senja", huruf: "S", hurufHijaiyah: "ش" },
    { id: 551, arab: "ترجرج نور النجوم", transliterasi: "Tarjurj Nūr an-Nujūm", indo: "Kelap-kelip Bintang", inggris: "Twinkling of stars", definisi: "Berkelap-kelipnya bintang karena turbulensi atmosfer.", link: "https://id.wikipedia.org/wiki/Kelap-kelip_bintang", huruf: "K", hurufHijaiyah: "ت" },

// Entri Huruf U
    { id: 552, arab: "العذارى", transliterasi: "al-'Adhārā", indo: "Udara", inggris: "Udara", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/Epsilon_Canis_Majoris", huruf: "U", hurufHijaiyah: "ع" },
    { id: 553, arab: "الظِلّ", transliterasi: "aẓ-Ẓill", indo: "Umbra", inggris: "Umbra", definisi: "Bayangan gelap inti saat gerhana.", link: "https://id.wikipedia.org/wiki/Umbra", huruf: "U", hurufHijaiyah: "ظ" },
    { id: 554, arab: "الكون", transliterasi: "al-Kawn", indo: "Alam Semesta", inggris: "Universe", definisi: "Seluruh ruang-waktu dan semua isinya.", link: "https://id.wikipedia.org/wiki/Alam_semesta", huruf: "A", hurufHijaiyah: "ك" },
    { id: 555, arab: "أورانس", transliterasi: "Ūrāns", indo: "Uranus", inggris: "Uranus", definisi: "Planet ketujuh dari Matahari.", link: "https://id.wikipedia.org/wiki/Uranus", huruf: "U", hurufHijaiyah: "ا" },
    { id: 556, arab: "الدب الأكبر", transliterasi: "ad-Dubb al-Akbar", indo: "Ursa Major", inggris: "Ursa Major", definisi: "Rasi beruang besar di langit utara.", link: "https://id.wikipedia.org/wiki/Ursa_Major_(rasi_bintang)", huruf: "U", hurufHijaiyah: "د" },
    { id: 557, arab: "الدب الأصغر", transliterasi: "ad-Dubb al-Aṣghar", indo: "Ursa Minor", inggris: "Ursae Minor", definisi: "Rasi beruang kecil yang mengandung bintang kutub.", link: "https://id.wikipedia.org/wiki/Ursa_Minor", huruf: "U", hurufHijaiyah: "د" },

// Entri Huruf V
    { id: 558, arab: "متغيّر", transliterasi: "Mutaghayyir", indo: "Variabel", inggris: "Variable", definisi: "Benda langit yang kecerahannya berubah.", link: "https://id.wikipedia.org/wiki/Bintang_variabel", huruf: "V", hurufHijaiyah: "م" },
    { id: 559, arab: "النجوم المتغيرة", transliterasi: "an-Nujūm al-Mutaghayyirah", indo: "Bintang Variabel", inggris: "Variable Stars", definisi: "Bintang yang kecerahannya berubah secara periodik.", link: "https://id.wikipedia.org/wiki/Bintang_variabel", huruf: "B", hurufHijaiyah: "ن" },
    { id: 560, arab: "التنوّع", transliterasi: "at-Tanawwu'", indo: "Variasi", inggris: "Variation", definisi: "Perubahan nilai atau posisi benda langit.", link: "https://id.wikipedia.org/wiki/Variasi", huruf: "V", hurufHijaiyah: "ت" },
    { id: 561, arab: "موجّه", transliterasi: "Muwajjah", indo: "Vektor", inggris: "Vector", definisi: "Besaran fisika yang memiliki arah dan besar.", link: "https://id.wikipedia.org/wiki/Vektor", huruf: "V", hurufHijaiyah: "م" },
    { id: 562, arab: "النسر الواقع", transliterasi: "an-Nasr al-Wāqi'", indo: "Vega", inggris: "Vega", definisi: "Bintang tercerah di rasi Lyra.", link: "https://id.wikipedia.org/wiki/Vega", huruf: "V", hurufHijaiyah: "ن" },
    { id: 563, arab: "الشراع", transliterasi: "ash-Shirā'", indo: "Vela", inggris: "Vela", definisi: "Rasi bintang layar (bagian dari Argo Navis).", link: "https://id.wikipedia.org/wiki/Vela_(rasi_bintang)", huruf: "V", hurufHijaiyah: "ش" },
    { id: 564, arab: "السرعة", transliterasi: "as-Sur'ah", indo: "Kecepatan", inggris: "Velocity", definisi: "Laju dan arah gerak benda langit.", link: "https://id.wikipedia.org/wiki/Kecepatan", huruf: "K", hurufHijaiyah: "س" },
    { id: 565, arab: "الزُّهرَة", transliterasi: "az-Zuharah", indo: "Venus", inggris: "Venus", definisi: "Planet kedua dari Matahari (bintang kejora).", link: "https://id.wikipedia.org/wiki/Venus", huruf: "V", hurufHijaiyah: "ز" },
    { id: 566, arab: "ربيعيّ", transliterasi: "Rabī'ī", indo: "Musim Semi", inggris: "Vernal", definisi: "Berhubungan dengan musim semi atau ekuinoks Maret.", link: "https://id.wikipedia.org/wiki/Musim_semi", huruf: "M", hurufHijaiyah: "ر" },
    { id: 567, arab: "الاعتدال الربيعي", transliterasi: "al-I'tidāl ar-Rabī'ī", indo: "Ekuinoks Semi", inggris: "Vernal Equinox", definisi: "Titik awal musim semi di belahan utara (20 Maret).", link: "https://id.wikipedia.org/wiki/Ekuinoks", huruf: "E", hurufHijaiyah: "ا" },
    { id: 568, arab: "المدقق", transliterasi: "al-Mudaqqiq", indo: "Vernier", inggris: "Vernier", definisi: "Skala tambahan untuk pengukuran presisi.", link: "https://id.wikipedia.org/wiki/Skala_vernier", huruf: "V", hurufHijaiyah: "م" },
    { id: 569, arab: "الدوائر القائمة", transliterasi: "ad-Dawā'ir al-Qā'imah", indo: "Lingkaran Vertikal", inggris: "Vertical Circles", definisi: "Lingkaran besar yang tegak lurus horizon.", link: "https://en.wikipedia.org/wiki/Vertical_circle", huruf: "L", hurufHijaiyah: "د" },
    { id: 570, arab: "المجرة", transliterasi: "al-Majarrah", indo: "Bima Sakti", inggris: "Via Lactea", definisi: "Galaksi spiral tempat tata surya kita.", link: "https://id.wikipedia.org/wiki/Bima_Sakti", huruf: "B", hurufHijaiyah: "م" },
    { id: 571, arab: "المـُـــتقدِّم للقِطاف", transliterasi: "al-Mutaqaddim li al-Qiṭāf", indo: "Vindemiatrix", inggris: "Vindemiatrix", definisi: "Bintang di rasi Virgo.", link: "https://en.wikipedia.org/wiki/Vindemiatrix", huruf: "V", hurufHijaiyah: "م" },
    { id: 572, arab: "السُّنبلة", transliterasi: "as-Sunbulah", indo: "Virgo", inggris: "Virgo", definisi: "Rasi zodiak keenam (perawan).", link: "https://id.wikipedia.org/wiki/Virgo_(rasi_bintang)", huruf: "V", hurufHijaiyah: "س" },
    { id: 573, arab: "الافق النظري", transliterasi: "al-Ufuq an-Naẓarī", indo: "Horizon Nyata", inggris: "Visible horizon", definisi: "Garis horizon yang terlihat oleh pengamat.", link: "https://en.wikipedia.org/wiki/Horizon", huruf: "H", hurufHijaiyah: "ا" },
    { id: 574, arab: "السمكة الطيارة", transliterasi: "as-Samakah aṭ-Ṭayyārah", indo: "Volans", inggris: "Volans", definisi: "Rasi bintang ikan terbang di selatan.", link: "https://id.wikipedia.org/wiki/Volans_(rasi_bintang)", huruf: "V", hurufHijaiyah: "س" },
    { id: 575, arab: "البراكين", transliterasi: "al-Barākīn", indo: "Gunung Api", inggris: "Volcanoes", definisi: "Letusan gunung berapi di permukaan planet.", link: "https://id.wikipedia.org/wiki/Gunung_berapi", huruf: "G", hurufHijaiyah: "ب" },
    { id: 576, arab: "الثعلب والوزَّة", transliterasi: "ath-Tha'lab wa al-Wazzah", indo: "Vulpecula", inggris: "Vulpecula", definisi: "Rasi rubah dan angsa di langit utara.", link: "https://id.wikipedia.org/wiki/Vulpecula_(rasi_bintang)", huruf: "V", hurufHijaiyah: "ث" },

// Entri Huruf W
    { id: 577, arab: "مُحاق القمر", transliterasi: "Muḥāq al-Qamar", indo: "Bulan Suram", inggris: "Waning Moon", definisi: "Fase Bulan menuju gelap (akhir bulan).", link: "https://id.wikipedia.org/wiki/Fase_Bulan#Bulan_baru", huruf: "W", hurufHijaiyah: "م" },
    { id: 578, arab: "زيادة القمر", transliterasi: "Ziyādat al-Qamar", indo: "Bulan Sabit", inggris: "Waxing Moon", definisi: "Fase Bulan menuju purnama (awal bulan).", link: "https://id.wikipedia.org/wiki/Fase_Bulan#Bulan_sabit_awal", huruf: "W", hurufHijaiyah: "ز" },
    { id: 579, arab: "الوَزن في الكلب الاكبر", transliterasi: "al-Wazn fī al-Kalb al-Akbar", indo: "Wezen", inggris: "Wezen", definisi: "Bintang raksasa di rasi Canis Major.", link: "https://en.wikipedia.org/wiki/Wezen", huruf: "W", hurufHijaiyah: "و" },
    { id: 580, arab: "الأقزام البيضاء", transliterasi: "al-Aqzām al-Bayḍā'", indo: "Katai Putih", inggris: "White Dwarf", definisi: "Sisa bintang mati dengan kerapatan sangat tinggi.", link: "https://id.wikipedia.org/wiki/Katai_putih", huruf: "W", hurufHijaiyah: "ا" },
    { id: 581, arab: "المــُــنْقَلَب الشَّتويّ", transliterasi: "al-Munqalab ash-Shatawī", indo: "Titik Balik Musim Dingin", inggris: "Winter Solstice", definisi: "Hari terpendek di belahan utara (21 Desember).", link: "https://id.wikipedia.org/wiki/Titik_balik_musim_dingin", huruf: "W", hurufHijaiyah: "م" },
    { id: 582, arab: "ثُقب دوديّ", transliterasi: "Thaqb Dawdī", indo: "Lubang Cacing", inggris: "Wormhole", definisi: "Terowongan hipotetis ruang-waktu.", link: "https://id.wikipedia.org/wiki/Lubang_cacing", huruf: "W", hurufHijaiyah: "ث" },

// Entri Huruf X
    { id: 583, arab: "رمز المجهول في الرياضيات", transliterasi: "Ramz al-Majhūl fī ar-Riyāḍiyyāt", indo: "X (Variabel)", inggris: "X", definisi: "Simbol variabel dalam rumus astronomi.", link: "https://id.wikipedia.org/wiki/Variabel", huruf: "X", hurufHijaiyah: "ر" },
    { id: 584, arab: "الإِحْدَاثي السيني", transliterasi: "al-Iḥdāthī as-Sīnī", indo: "Koordinat X", inggris: "X-Co-ordinate", definisi: "Koordinat horizontal pada sumbu X.", link: "https://id.wikipedia.org/wiki/Sistem_koordinat", huruf: "X", hurufHijaiyah: "ا" },

// Entri Huruf Y
    { id: 585, arab: "سنة", transliterasi: "Sanah", indo: "Tahun", inggris: "Year", definisi: "Waktu orbit Bumi mengelilingi Matahari (~365,25 hari).", link: "https://id.wikipedia.org/wiki/Tahun", huruf: "Y", hurufHijaiyah: "س" },
    { id: 586, arab: "مَرْكَب", transliterasi: "Markab", indo: "Yed Alpheras", inggris: "Yed Alpheras", definisi: "Bintang di rasi Ophiuchus (tangan kiri).", link: "https://en.wikipedia.org/wiki/Epsilon_Ophiuchi", huruf: "Y", hurufHijaiyah: "م" },
    { id: 587, arab: "المــُـــؤَخّر في يد الحَوّاء اليسرى", transliterasi: "al-Mu'akhkhar fī Yad al-Ḥawwā' al-Yusrā", indo: "Yed Posterior", inggris: "Yed Posterior", definisi: "Bintang di rasi Ophiuchus (belakang).", link: "https://en.wikipedia.org/wiki/Delta_Ophiuchi", huruf: "Y", hurufHijaiyah: "م" },
    { id: 588, arab: "المقدّم في يد الحَوّاء اليسرى", transliterasi: "al-Muqaddam fī Yad al-Ḥawwā' al-Yusrā", indo: "Yed Prior", inggris: "Yed Prior", definisi: "Bintang di rasi Ophiuchus (depan).", link: "https://en.wikipedia.org/wiki/Epsilon_Ophiuchi", huruf: "Y", hurufHijaiyah: "م" },
    { id: 589, arab: "ييلدز", transliterasi: "Yīldiz", indo: "Yildum", inggris: "Yildum", definisi: "Nama bintang dalam astronomi Arab.", link: "https://en.wikipedia.org/wiki/List_of_Arabic_star_names", huruf: "Y", hurufHijaiyah: "ي" },

// Entri Huruf Z
    { id: 590, arab: "الزاوية", transliterasi: "az-Zāwiyah", indo: "Zaniah", inggris: "Zaniah", definisi: "Bintang di rasi Virgo.", link: "https://en.wikipedia.org/wiki/Eta_Virginis", huruf: "Z", hurufHijaiyah: "ز" },
    { id: 591, arab: "الزَوْرَق", transliterasi: "az-Zawraq", indo: "Zaurak", inggris: "Zaurak", definisi: "Bintang di rasi Eridanus.", link: "https://en.wikipedia.org/wiki/Gamma_Eridani", huruf: "Z", hurufHijaiyah: "ز" },
    { id: 592, arab: "زاوية العوَّاء", transliterasi: "Zāwiyat al-'Awwā'", indo: "Zavijava", inggris: "Zavijava", definisi: "Bintang di rasi Virgo.", link: "https://en.wikipedia.org/wiki/Beta_Virginis", huruf: "Z", hurufHijaiyah: "ز" },
    { id: 593, arab: "سمت الرأس", transliterasi: "Samt ar-Ra's", indo: "Zenith", inggris: "Zenith", definisi: "Titik tepat di atas pengamat di bola langit.", link: "https://id.wikipedia.org/wiki/Zenit", huruf: "Z", hurufHijaiyah: "س" },
    { id: 594, arab: "البُعد السمتيّ", transliterasi: "al-Bu'd as-Samtī", indo: "Jarak Zenith", inggris: "Zenith distance", definisi: "Jarak sudut dari zenith ke suatu objek.", link: "https://id.wikipedia.org/wiki/Zenit#Jarak_zenit", huruf: "Z", hurufHijaiyah: "ب" },
    { id: 595, arab: "منطقة البروج", transliterasi: "Minṭaqat al-Burūj", indo: "Zodiak", inggris: "Zodiac", definisi: "12 rasi bintang di sepanjang ekliptika.", link: "https://id.wikipedia.org/wiki/Zodiak", huruf: "Z", hurufHijaiyah: "م" },
    { id: 596, arab: "النور البرجي", transliterasi: "an-Nūr al-Burjī", indo: "Cahaya Zodiak", inggris: "Zodiacal light", definisi: "Cahaya samar berbentuk kerucut di ekliptika.", link: "https://id.wikipedia.org/wiki/Cahaya_zodiak", huruf: "Z", hurufHijaiyah: "ن" },
    { id: 597, arab: "المِنطقة", transliterasi: "al-Minṭaqah", indo: "Zona", inggris: "Zone", definisi: "Wilayah atau sabuk pembagian di langit.", link: "https://id.wikipedia.org/wiki/Zona", huruf: "Z", hurufHijaiyah: "م" },
    { id: 598, arab: "زُبرة الاسد", transliterasi: "Zubrat al-Asad", indo: "Zosma", inggris: "Zosma", definisi: "Bintang di rasi Leo.", link: "https://en.wikipedia.org/wiki/Delta_Leonis", huruf: "Z", hurufHijaiyah: "ز" },
];

// ===================== FUNGSI RENDER =====================
function dapatkanDataTerfilter() {
    let filtered = termsData.filter(item => {
        if (hurufTerpilih) {
            if (modeSortHuruf === "latin" && item.huruf !== hurufTerpilih) return false;
            if (modeSortHuruf === "hijaiyah" && item.hurufHijaiyah !== hurufTerpilih) return false;
        }
        if (kataKunciPencarian) {
            const keyword = kataKunciPencarian.toLowerCase();
            return item.indo.toLowerCase().includes(keyword) ||
                   item.inggris.toLowerCase().includes(keyword) ||
                   item.arab.includes(keyword) ||
                   item.transliterasi.toLowerCase().includes(keyword);
        }
        return true;
    });
    if (modeSortHuruf === "latin") {
        filtered.sort((a, b) => a.indo.localeCompare(b.indo, 'id', { sensitivity: 'base' }));
    } else {
        filtered.sort((a, b) => a.arab.localeCompare(b.arab, 'ar'));
    }
    return filtered;
}

function renderFilterHuruf() {
    alfabetFilterContainer.innerHTML = "";
    const listHuruf = modeSortHuruf === "latin" ? listAlfabet : listHijaiyah;
    listHuruf.forEach(huruf => {
        const btn = document.createElement("button");
        btn.textContent = huruf;
        btn.classList.add("letter-btn");
        if (huruf === hurufTerpilih) btn.classList.add("active-letter");
        btn.addEventListener("click", () => {
            hurufTerpilih = hurufTerpilih === huruf ? null : huruf;
            halamanSekarang = 1;
            renderApp();
        });
        alfabetFilterContainer.appendChild(btn);
    });
}

function getPaginationPages(currentPage, totalPages, maxVisible = 5) {
    if (totalPages <= 1) return [1];
    const pages = [];
    pages.push(1);
    let start = Math.max(2, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) pages.push(i);
    }
    if (end < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages.filter((v, i, a) => a.indexOf(v) === i);
}

function tutupKartuFokus() {
    const focusedCard = document.querySelector('.card.focused');
    if (focusedCard) {
        focusedCard.style.transition = 'opacity 0.2s ease';
        focusedCard.style.opacity = '0';
        setTimeout(() => {
            focusedCard.classList.remove('focused');
            focusedCard.style.opacity = '';
            focusedCard.style.transition = '';
            const closeBtn = focusedCard.querySelector('.close-card-btn');
            if (closeBtn) closeBtn.style.display = 'none';
            const copyBtn = focusedCard.querySelector('.copy-btn');
            if (copyBtn) copyBtn.style.display = 'none';
            const linkBtn = focusedCard.querySelector('.link-btn');
            if (linkBtn) linkBtn.style.display = 'none';
            focusedCard.style.position = '';
            focusedCard.style.top = '';
            focusedCard.style.left = '';
            focusedCard.style.transform = '';
        }, 200);
    }
    document.body.classList.remove('has-focus');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overflow = '';
    if (savedScrollY) {
        window.scrollTo(0, savedScrollY);
        savedScrollY = 0;
    }
}

function bukaFokus(card) {
    document.querySelectorAll('.card.focused').forEach(c => {
        c.classList.remove('focused');
        const btn = c.querySelector('.close-card-btn');
        if (btn) btn.style.display = 'none';
        const copy = c.querySelector('.copy-btn');
        if (copy) copy.style.display = 'none';
        const link = c.querySelector('.link-btn');
        if (link) link.style.display = 'none';
        c.style.position = '';
        c.style.top = '';
        c.style.left = '';
        c.style.transform = '';
        c.style.opacity = '';
    });
    document.body.classList.remove('has-focus');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overflow = '';

    savedScrollY = window.scrollY;

    card.classList.add('focused');
    document.body.classList.add('has-focus');
    document.body.style.position = 'fixed';
    document.body.style.top = -savedScrollY + 'px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    const btnClose = card.querySelector('.close-card-btn');
    if (btnClose) btnClose.style.display = 'block';
    const copy = card.querySelector('.copy-btn');
    if (copy) copy.style.display = 'flex';
    const link = card.querySelector('.link-btn');
    if (link) link.style.display = 'flex';
    card.style.opacity = '0';
    setTimeout(() => { card.style.opacity = '1'; }, 10);
}

function tampilkanHalaman(dataTerfilter) {
    tutupKartuFokus();
    container.innerHTML = "";
    if (entriCountText) entriCountText.innerHTML = `📚 Total entri: ${dataTerfilter.length}`;
    if (dataTerfilter.length === 0) {
        container.classList.remove('rtl-grid');
        const keyword = kataKunciPencarian || '';
        container.innerHTML = `
            <div class="not-found-msg">
                🔍 Data tidak ditemukan${keyword ? ' untuk "' + keyword + '"' : ''}.
            </div>
        `;
        return;
    }
    
    const indeksAwal = (halamanSekarang - 1) * KARTU_PER_HALAMAN;
    const indeksAkhir = indeksAwal + KARTU_PER_HALAMAN;
    const dataHalamanIni = dataTerfilter.slice(indeksAwal, indeksAkhir);

    dataHalamanIni.forEach(data => {
        const card = document.createElement("div");
        card.classList.add("card");
        const isFav = userFavorites.has(data.id);
        const starClass = isFav ? "fas fa-star" : "far fa-star";
        card.innerHTML = `
            <button class="close-card-btn" style="display: none;">&times;</button>
            <i class="${starClass} fav-star" data-id="${data.id}" role="img" aria-label="${isFav ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}"></i>
            <h3>${data.indo}</h3>
            <p><strong>${data.transliterasi}</strong> / <span>${data.inggris}</span></p>
            <div class="arabic-text">${data.arab}</div>
            <p class="definition">${data.definisi}</p>
            <button class="copy-btn" style="display: none;" title="Salin teks kartu"><i class="fas fa-copy"></i></button>
            <button class="link-btn" style="display: none;" title="Buka sumber"><i class="fas fa-link"></i></button>
        `;
        const closeBtn = card.querySelector('.close-card-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tutupKartuFokus();
        });
        const starIcon = card.querySelector('.fav-star');
        starIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(starIcon.dataset.id);
            toggleFavorite(id);
        });
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = `${data.indo}\n${data.transliterasi} / ${data.inggris}\n${data.arab}\n${data.definisi}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'fas fa-check';
                setTimeout(() => { icon.className = 'fas fa-copy'; }, 1500);
            }).catch(() => {
                alert('Gagal menyalin teks. Coba lagi.');
            });
        });
        const linkBtn = card.querySelector('.link-btn');
        linkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (data.link) {
                window.open(data.link, '_blank');
            } else {
                alert('Tidak ada link tersedia.');
            }
        });
        card.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('close-card-btn') || e.target.classList.contains('fav-star') || e.target.closest('.copy-btn') || e.target.closest('.link-btn')) return;
            if (card.classList.contains("focused")) return;
            bukaFokus(card);
        });
        container.appendChild(card);
    });
    container.classList.remove('rtl-grid');
    if (modeSortHuruf === "hijaiyah") {
        container.classList.add('rtl-grid');
    }
}

function updateNavigasi(dataTerfilter) {
    const totalHalaman = Math.ceil(dataTerfilter.length / KARTU_PER_HALAMAN);
    btnBack.disabled = (halamanSekarang === 1);
    btnNext.disabled = (halamanSekarang === totalHalaman || totalHalaman === 0);
    pageNumbersContainer.innerHTML = "";
    if (totalHalaman === 0) return;
    const pages = getPaginationPages(halamanSekarang, totalHalaman);
    pages.forEach(page => {
        if (page === '...') {
            const dots = document.createElement("span");
            dots.textContent = "...";
            dots.classList.add("page-dots");
            pageNumbersContainer.appendChild(dots);
        } else {
            const pageButton = document.createElement("button");
            pageButton.textContent = page;
            pageButton.classList.add("page-num-btn");
            if (page === halamanSekarang) pageButton.classList.add("active-page");
            pageButton.addEventListener("click", () => {
                halamanSekarang = page;
                renderApp();
            });
            pageNumbersContainer.appendChild(pageButton);
        }
    });
}

function renderApp() {
    tutupKartuFokus();
    const dataTerfilter = dapatkanDataTerfilter();
    renderFilterHuruf();
    tampilkanHalaman(dataTerfilter);
    updateNavigasi(dataTerfilter);
}

function renderFavoritPage() {
    tutupKartuFokus();
    let favTerms = termsData.filter(t => userFavorites.has(t.id));
    favTerms.sort((a, b) => a.indo.localeCompare(b.indo, 'id', { sensitivity: 'base' }));
    if (favSearchKeyword && favSearchKeyword.trim() !== '') {
        const kw = favSearchKeyword.toLowerCase();
        favTerms = favTerms.filter(item => {
            return item.indo.toLowerCase().includes(kw) ||
                   item.inggris.toLowerCase().includes(kw) ||
                   item.arab.includes(kw) ||
                   item.transliterasi.toLowerCase().includes(kw);
        });
    }
    favDataCache = favTerms;
    const totalHalaman = Math.ceil(favDataCache.length / FAV_KARTU_PER_HALAMAN);
    if (favHalamanSekarang > totalHalaman && totalHalaman > 0) favHalamanSekarang = totalHalaman;
    if (favHalamanSekarang < 1) favHalamanSekarang = 1;
    const start = (favHalamanSekarang - 1) * FAV_KARTU_PER_HALAMAN;
    const end = start + FAV_KARTU_PER_HALAMAN;
    const dataHalaman = favDataCache.slice(start, end);
    const containerFav = document.getElementById("fav-card-container");
    if (!containerFav) return;
    if (favDataCache.length === 0) {
        containerFav.innerHTML = `
            <div class="empty-fav-message" style="grid-column:1/-1; text-align:center; padding:80px 20px; font-size:1.3rem; border-radius:20px;">
                ${favSearchKeyword ? '🔍 Tidak ada favorit yang cocok dengan "' + favSearchKeyword + '".' : '⭐ Belum ada istilah favorit.<br>Tambahkan dari glosarium. ⭐'}
            </div>
        `;
        const navButton = document.getElementById("fav-nav-button");
        if (navButton) navButton.style.display = "none";
        document.body.classList.remove("has-focus");
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.overflow = '';
        return;
    }
    document.getElementById("fav-nav-button").style.display = "flex";
    containerFav.innerHTML = dataHalaman.map(item => `
        <div class="card" data-id="${item.id}">
            <i class="fas fa-star fav-star" data-id="${item.id}" role="img" aria-label="Hapus dari favorit"></i>
            <h3>${item.indo}</h3>
            <p><strong>${item.transliterasi}</strong> / ${item.inggris}</p>
            <div class="arabic-text">${item.arab}</div>
            <p class="definition">${item.definisi}</p>
            <button class="copy-btn" style="display: none;" title="Salin teks kartu"><i class="fas fa-copy"></i></button>
            <button class="link-btn" style="display: none;" title="Buka sumber"><i class="fas fa-external-link-alt"></i></button>
        </div>
    `).join("");

    document.querySelectorAll("#fav-card-container .copy-btn").forEach(copyBtn => {
        const card = copyBtn.closest('.card');
        const itemId = parseInt(card.dataset.id);
        const item = termsData.find(t => t.id === itemId);
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = `${item.indo}\n${item.transliterasi} / ${item.inggris}\n${item.arab}\n${item.definisi}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'fas fa-check';
                setTimeout(() => { icon.className = 'fas fa-copy'; }, 1500);
            }).catch(() => {
                alert('Gagal menyalin teks. Coba lagi.');
            });
        });
    });
    document.querySelectorAll("#fav-card-container .link-btn").forEach(linkBtn => {
        const card = linkBtn.closest('.card');
        const itemId = parseInt(card.dataset.id);
        const item = termsData.find(t => t.id === itemId);
        linkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.link) {
                window.open(item.link, '_blank');
            } else {
                alert('Tidak ada link tersedia.');
            }
        });
    });

    containerFav.classList.remove('rtl-grid');
    if (modeSortHuruf === "hijaiyah") {
        containerFav.classList.add('rtl-grid');
    }

    document.querySelectorAll("#fav-card-container .fav-star").forEach(star => {
        star.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = parseInt(star.dataset.id);
            toggleFavorite(id);
        });
    });
    document.querySelectorAll("#fav-card-container .card").forEach(card => {
        card.addEventListener("click", (e) => {
            if (e.target.classList.contains("fav-star") || e.target.closest('.copy-btn') || e.target.closest('.link-btn')) return;
            if (card.classList.contains("focused")) {
                tutupKartuFokus();
            } else {
                bukaFokus(card);
            }
        });
    });
    updateFavNavigasi(totalHalaman);
}

function updateFavNavigasi(totalHalaman) {
    const backBtn = document.getElementById("fav-btn-back");
    const nextBtn = document.getElementById("fav-btn-next");
    const pageContainer = document.getElementById("fav-page-numbers");
    if (!backBtn) return;
    backBtn.disabled = (favHalamanSekarang === 1);
    nextBtn.disabled = (favHalamanSekarang === totalHalaman || totalHalaman === 0);
    pageContainer.innerHTML = "";
    if (totalHalaman === 0) return;
    const pages = getPaginationPages(favHalamanSekarang, totalHalaman);
    pages.forEach(page => {
        if (page === '...') {
            const dots = document.createElement("span");
            dots.textContent = "...";
            dots.classList.add("page-dots");
            pageContainer.appendChild(dots);
        } else {
            const btn = document.createElement("button");
            btn.textContent = page;
            btn.classList.add("page-num-btn");
            if (page === favHalamanSekarang) btn.classList.add("active-page");
            btn.onclick = () => {
                favHalamanSekarang = page;
                renderFavoritPage();
            };
            pageContainer.appendChild(btn);
        }
    });
}

function renderHomeResults() {
    if (!homeKeyword && homeDataCache.length === 0) {
        homeResultsContainer.innerHTML = '';
        document.getElementById('home-nav-button').style.display = 'none';
        return;
    }

    const totalHalaman = Math.ceil(homeDataCache.length / HOME_KARTU_PER_HALAMAN);
    if (homeHalamanSekarang > totalHalaman && totalHalaman > 0) homeHalamanSekarang = totalHalaman;
    if (homeHalamanSekarang < 1) homeHalamanSekarang = 1;

    const start = (homeHalamanSekarang - 1) * HOME_KARTU_PER_HALAMAN;
    const end = start + HOME_KARTU_PER_HALAMAN;
    const dataHalaman = homeDataCache.slice(start, end);

    if (homeDataCache.length === 0) {
        homeResultsContainer.innerHTML = `<div class="no-result-message">🔍 Data tidak ditemukan untuk "${homeKeyword}".</div>`;
        document.getElementById('home-nav-button').style.display = 'none';
        return;
    }

    if (totalHalaman > 1) {
        document.getElementById('home-nav-button').style.display = 'flex';
    } else {
        document.getElementById('home-nav-button').style.display = 'none';
    }

    homeResultsContainer.innerHTML = dataHalaman.map(item => {
        const isFav = userFavorites.has(item.id);
        const starClass = isFav ? "fas fa-star" : "far fa-star";
        return `
            <div class="card" data-id="${item.id}">
                <button class="close-card-btn" style="display: none;">&times;</button>
                <i class="${starClass} fav-star" data-id="${item.id}" role="img" aria-label="${isFav ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}"></i>
                <h3>${item.indo}</h3>
                <p><strong>${item.transliterasi}</strong> / <span>${item.inggris}</span></p>
                <div class="arabic-text">${item.arab}</div>
                <p class="definition">${item.definisi}</p>
                <button class="copy-btn" style="display: none;" title="Salin teks kartu"><i class="fas fa-copy"></i></button>
                <button class="link-btn" style="display: none;" title="Buka sumber"><i class="fas fa-link"></i></button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('#homeSearchResults .card').forEach(card => {
        const dataId = parseInt(card.dataset.id);
        const data = termsData.find(t => t.id === dataId);

        const closeBtn = card.querySelector('.close-card-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tutupKartuFokus();
        });

        const starIcon = card.querySelector('.fav-star');
        starIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(starIcon.dataset.id);
            toggleFavorite(id);
        });

        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = `${data.indo}\n${data.transliterasi} / ${data.inggris}\n${data.arab}\n${data.definisi}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'fas fa-check';
                setTimeout(() => { icon.className = 'fas fa-copy'; }, 1500);
            }).catch(() => {
                alert('Gagal menyalin teks. Coba lagi.');
            });
        });

        const linkBtn = card.querySelector('.link-btn');
        linkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (data.link) {
                window.open(data.link, '_blank');
            } else {
                alert('Tidak ada link tersedia.');
            }
        });

        card.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('close-card-btn') || e.target.classList.contains('fav-star') || e.target.closest('.copy-btn') || e.target.closest('.link-btn')) return;
            if (card.classList.contains('focused')) return;
            bukaFokus(card);
        });
    });

    updateHomeNavigasi(totalHalaman);
}

function updateHomeNavigasi(totalHalaman) {
    const backBtn = document.getElementById('home-btn-back');
    const nextBtn = document.getElementById('home-btn-next');
    const pageContainer = document.getElementById('home-page-numbers');
    if (!backBtn) return;
    backBtn.disabled = (homeHalamanSekarang === 1);
    nextBtn.disabled = (homeHalamanSekarang === totalHalaman || totalHalaman === 0);
    pageContainer.innerHTML = "";
    if (totalHalaman === 0) return;
    const pages = getPaginationPages(homeHalamanSekarang, totalHalaman);
    pages.forEach(page => {
        if (page === '...') {
            const dots = document.createElement("span");
            dots.textContent = "...";
            dots.classList.add("page-dots");
            pageContainer.appendChild(dots);
        } else {
            const btn = document.createElement("button");
            btn.textContent = page;
            btn.classList.add("page-num-btn");
            if (page === homeHalamanSekarang) btn.classList.add("active-page");
            btn.onclick = () => {
                homeHalamanSekarang = page;
                renderHomeResults();
            };
            pageContainer.appendChild(btn);
        }
    });
}

function searchInHome(keyword) {
    homeKeyword = keyword.trim();
    if (!homeKeyword) {
        homeResultsContainer.innerHTML = '';
        document.getElementById('home-nav-button').style.display = 'none';
        return;
    }
    const lowerKeyword = homeKeyword.toLowerCase();
    const results = termsData.filter(item => {
        return item.indo.toLowerCase().includes(lowerKeyword) ||
               item.inggris.toLowerCase().includes(lowerKeyword) ||
               item.arab.includes(lowerKeyword) ||
               item.transliterasi.toLowerCase().includes(lowerKeyword);
    });
    homeDataCache = results;
    homeHalamanSekarang = 1;
    renderHomeResults();
}

// ===================== FORM MASUKAN (dengan perbaikan) =====================
const fileInput = document.getElementById('masukan-file');
const filePreviewContainer = document.getElementById('file-list-preview');
const progressContainer = document.getElementById('upload-progress-container');
const progressFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

let selectedFiles = [];

function setInputFiles(filesArray) {
    const dataTransfer = new DataTransfer();
    filesArray.forEach(file => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;
}

function getTotalSize(files) {
    let total = 0;
    for (let i = 0; i < files.length; i++) {
        total += files[i].size;
    }
    return total;
}

function updateProgress(files) {
    const totalBytes = getTotalSize(files);
    const totalMB = totalBytes / (1024 * 1024);
    const percent = Math.min((totalBytes / MAX_SIZE_BYTES) * 100, 100);
    
    progressFill.style.width = percent + '%';
    progressText.textContent = `Total: ${totalMB.toFixed(2)} MB / ${MAX_SIZE_MB} MB`;
    progressPercent.textContent = Math.round(percent) + '%';
    
    progressFill.classList.remove('warning', 'danger');
    if (totalBytes > MAX_SIZE_BYTES) {
        progressFill.classList.add('danger');
    } else if (totalBytes > MAX_SIZE_BYTES * 0.8) {
        progressFill.classList.add('warning');
    }
    
    progressContainer.style.display = files.length > 0 ? 'block' : 'none';
}

function renderFileList() {
    const files = selectedFiles;
    filePreviewContainer.innerHTML = '';
    
    if (files.length === 0) {
        updateProgress(files);
        return;
    }
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('file-name');
        nameSpan.textContent = file.name;
        
        const sizeSpan = document.createElement('span');
        sizeSpan.classList.add('file-size');
        sizeSpan.textContent = `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        
        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-file-btn');
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Hapus file ini';
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            selectedFiles.splice(index, 1);
            setInputFiles(selectedFiles);
            renderFileList();
            updateProgress(selectedFiles);
        });
        
        fileItem.appendChild(nameSpan);
        fileItem.appendChild(sizeSpan);
        fileItem.appendChild(removeBtn);
        filePreviewContainer.appendChild(fileItem);
    });
    
    updateProgress(files);
}

fileInput.addEventListener('change', function(e) {
    const newFiles = Array.from(e.target.files);
    const combined = [...selectedFiles, ...newFiles];
    const totalBytes = combined.reduce((acc, file) => acc + file.size, 0);
    const totalMB = totalBytes / (1024 * 1024);
    
    if (totalBytes > MAX_SIZE_BYTES) {
        alert(`❌ Gagal: Total ukuran file Anda (${totalMB.toFixed(2)} MB) melebihi batas maksimal ${MAX_SIZE_MB} MB!`);
        this.value = '';
        setInputFiles(selectedFiles);
        renderFileList();
        updateProgress(selectedFiles);
        return;
    }
    
    selectedFiles = combined;
    setInputFiles(selectedFiles);
    renderFileList();
    updateProgress(selectedFiles);
});

document.getElementById('form-masukan-real').addEventListener('submit', async function(event) {
    event.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const nama = document.getElementById('masukan-nama').value.trim();
    const pesan = document.getElementById('masukan-pesan').value.trim();
    const files = fileInput.files;

    if (!nama || !pesan) {
        alert('Nama dan pesan wajib diisi.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Masukan 🚀';
        return;
    }

    let fileUrls = [];
    if (files.length > 0) {
        for (let file of files) {
            const fileExt = file.name.split('.').pop();
            const userId = currentUser ? currentUser.id : 'anonymous';
            const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2,6)}.${fileExt}`;
            const { data, error } = await supabaseClient.storage
                .from('masukan')
                .upload(fileName, file);
            if (error) {
                alert('Gagal upload file: ' + error.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kirim Masukan 🚀';
                return;
            }
            const { publicURL } = supabaseClient.storage
                .from('masukan')
                .getPublicUrl(fileName);
            fileUrls.push(publicURL);
        }
    }

    const { error } = await supabase
        .from('masukan')
        .insert({
            user_id: currentUser ? currentUser.id : null,
            nama: nama,
            pesan: pesan,
            file_urls: fileUrls
        });

    if (error) {
        alert('Gagal mengirim masukan: ' + error.message);
    } else {
        alert('Terima kasih! Masukan Anda berhasil dikirim. ✨');
        this.reset();
        selectedFiles = [];
        setInputFiles(selectedFiles);
        filePreviewContainer.innerHTML = '';
        updateProgress(selectedFiles);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kirim Masukan 🚀';
});

// ===================== NAVIGASI HALAMAN =====================
function gantiHalaman(targetHalaman, tombolAktif) {
    document.body.classList.remove('has-focus');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overflow = '';
    tutupKartuFokus();
    document.querySelectorAll(".card").forEach(c => {
        c.classList.remove("focused");
        c.style.position = '';
        c.style.top = '';
        c.style.left = '';
        c.style.transform = '';
        const btn = c.querySelector('.close-card-btn');
        if (btn) btn.style.display = 'none';
    });
    if (halamanHome) halamanHome.classList.add('hidden');
    if (halamanGlosarium) halamanGlosarium.classList.add('hidden');
    if (halamanFavorit) halamanFavorit.classList.add('hidden');
    if (halamanMasukan) halamanMasukan.classList.add('hidden');
    if (targetHalaman) targetHalaman.classList.remove('hidden');
    [navLinkHome, navLinkGlosarium, navLinkFavorit, navLinkMasukan].forEach(link => {
        if (link) link.classList.remove('active');
    });
    if (tombolAktif) tombolAktif.classList.add('active');
    if (targetHalaman === halamanHome || targetHalaman === halamanMasukan) {
        if (headerBesar) headerBesar.style.display = 'none';
        if (targetHalaman === halamanHome) {
            document.getElementById('home-nav-button').style.display = 'none';
        }
    } else {
        if (headerBesar) headerBesar.style.display = 'block';
        if (navbarKedua) navbarKedua.style.display = 'flex';
        const searchBox = document.getElementById('searchBoxSecond');
        if (searchBox) {
            searchBox.style.display = (targetHalaman === halamanGlosarium || targetHalaman === halamanFavorit) ? 'flex' : 'none';
        }
    }

    if (footerElement) {
        footerElement.style.display = (targetHalaman === halamanMasukan) ? 'none' : 'block';
    }

    if (targetHalaman === halamanGlosarium) {
        kataKunciPencarian = "";
        favSearchKeyword = "";
        if (searchInput) searchInput.value = "";
        renderApp();
    }
    if (targetHalaman === halamanFavorit) {
        favSearchKeyword = "";
        if (searchInput) searchInput.value = "";
        renderFavoritPage();
    }
}

// Event listeners navigasi
navLinkHome.addEventListener('click', (e) => { e.preventDefault(); gantiHalaman(halamanHome, navLinkHome); });
navLinkGlosarium.addEventListener('click', (e) => { e.preventDefault(); gantiHalaman(halamanGlosarium, navLinkGlosarium); });
navLinkFavorit.addEventListener('click', (e) => { e.preventDefault(); gantiHalaman(halamanFavorit, navLinkFavorit); });
navLinkMasukan.addEventListener('click', (e) => { e.preventDefault(); gantiHalaman(halamanMasukan, navLinkMasukan); });

tombolMulai.addEventListener('click', (e) => {
    e.preventDefault();
    gantiHalaman(halamanGlosarium, navLinkGlosarium);
});

const btnBackMasukanReal = document.getElementById('btn-back-masukan');
if (btnBackMasukanReal) {
    btnBackMasukanReal.addEventListener('click', (e) => {
        e.preventDefault();
        gantiHalaman(halamanGlosarium, navLinkGlosarium);
    });
}

toggleSortTypeBtn.addEventListener("click", () => {
    const isSwitchingToHijaiyah = (modeSortHuruf === "latin");
    if (isSwitchingToHijaiyah) {
        toggleSortTypeBtn.classList.add("spin-active");
    } else {
        toggleSortTypeBtn.classList.add("spin-active-ccw");
    }
    modeSortHuruf = modeSortHuruf === "latin" ? "hijaiyah" : "latin";
    hurufTerpilih = null;
    halamanSekarang = 1;
    renderApp();
});
toggleSortTypeBtn.addEventListener("animationend", () => {
    toggleSortTypeBtn.classList.remove("spin-active");
    toggleSortTypeBtn.classList.remove("spin-active-ccw");
});

searchInput.addEventListener("input", (e) => {
    const value = e.target.value;
    if (halamanFavorit && !halamanFavorit.classList.contains('hidden')) {
        favSearchKeyword = value;
        favHalamanSekarang = 1;
        renderFavoritPage();
    } else {
        kataKunciPencarian = value;
        halamanSekarang = 1;
        renderApp();
    }
});

btnBack.addEventListener("click", () => {
    if (halamanSekarang > 1) {
        halamanSekarang--;
        renderApp();
    }
});

btnNext.addEventListener("click", () => {
    const dataTerfilter = dapatkanDataTerfilter();
    const totalHalaman = Math.ceil(dataTerfilter.length / KARTU_PER_HALAMAN);
    if (halamanSekarang < totalHalaman) {
        halamanSekarang++;
        renderApp();
    }
});

const slider = document.getElementById('alfabetFilter');
let isDown = false;
let startX;
let scrollLeft;
if (slider) {
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });
}

const favBackBtn = document.getElementById("fav-btn-back");
const favNextBtn = document.getElementById("fav-btn-next");
if (favBackBtn) {
    favBackBtn.addEventListener("click", () => {
        if (favHalamanSekarang > 1) {
            favHalamanSekarang--;
            renderFavoritPage();
        }
    });
}
if (favNextBtn) {
    favNextBtn.addEventListener("click", () => {
        const total = Math.ceil(favDataCache.length / FAV_KARTU_PER_HALAMAN);
        if (favHalamanSekarang < total) {
            favHalamanSekarang++;
            renderFavoritPage();
        }
    });
}

homeSearchBtn.addEventListener('click', () => {
    searchInHome(homeSearchField.value);
});
homeSearchField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchInHome(homeSearchField.value);
});

const homeBackBtn = document.getElementById('home-btn-back');
const homeNextBtn = document.getElementById('home-btn-next');
if (homeBackBtn) {
    homeBackBtn.addEventListener("click", () => {
        if (homeHalamanSekarang > 1) {
            homeHalamanSekarang--;
            renderHomeResults();
        }
    });
}
if (homeNextBtn) {
    homeNextBtn.addEventListener("click", () => {
        const total = Math.ceil(homeDataCache.length / HOME_KARTU_PER_HALAMAN);
        if (homeHalamanSekarang < total) {
            homeHalamanSekarang++;
            renderHomeResults();
        }
    });
}

const toggleNavbar = document.getElementById('themeToggle');
const toggleHome = document.getElementById('homeThemeToggle');

function terapkanTema(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if(toggleNavbar) toggleNavbar.innerHTML = '<i class="fas fa-sun"></i>';
        if(toggleHome) toggleHome.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if(toggleNavbar) toggleNavbar.innerHTML = '<i class="fas fa-moon"></i>';
        if(toggleHome) toggleHome.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function handleToggleEvent() {
    const isDarkNow = document.documentElement.classList.contains('dark');
    terapkanTema(!isDarkNow);
}

toggleNavbar.addEventListener('click', handleToggleEvent);
toggleHome.addEventListener('click', handleToggleEvent);

const temaTersimpan = localStorage.getItem('theme') || 'dark'; 
terapkanTema(temaTersimpan === 'dark');

// ===================== TOGGLE PASSWORD VISIBILITY =====================
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetId = this.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const icon = this.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// ===================== INISIALISASI =====================
loadSession().then(() => {
    gantiHalaman(halamanHome, navLinkHome);
    if (footerElement) footerElement.style.display = 'block';
    updateFavCounter();
    createParticles('.floating-particles', 25);
});

document.getElementById('focus-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        tutupKartuFokus();
    }
});

// ===================== PARTIKEL =====================
function createParticles(containerSelector, count = 20, particleClass = 'particle') {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = particleClass;
        particle.style.left = Math.random() * 100 + '%';
        const duration = Math.random() * 20 + 15;
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = Math.random() * -20 + 's';
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        container.appendChild(particle);
    }
}
