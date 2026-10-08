const axios = require('axios');

// === KONFIGURASI ===
const API_URL = 'http://localhost:5000/api';
const BYPASS_KEY = 'swarm-bot-2026'; 
const TOTAL_POSTS = 300; // Naikkan jadi 80 biar lebih rame
const DELAY_MS = 150; 

// === DATABASE TOPIK & KONTEKS NATURAL ===
const TOPICS = [
    {
        id: "GEMPA", // Topik Bencana (Panic & Info)
        keywords: ["Gempa Bumi", "Guncangan", "Lindu", "Info BMKG"],
        hashtags: ["#GempaTerkini", "#StaySafe", "#PrayForIndo"],
        contexts: [
            "Waduh {keyword} barusan kerasa kenceng banget woy!",
            "Lagi enak rebahan tiba-tiba {keyword}, auto lari keluar rumah.",
            "Jujurly kaget banget ada {keyword} barusan, kirain pusing doang.",
            "Info valid dari grup WA katanya {keyword} pusatnya di laut.",
            "Stay safe guys, {keyword} susulan biasanya masih ada.",
            "Ya Allah lindungilah kami dari {keyword} ini, serem banget getarannya.",
            "Kerasa sampe lantai 25 {keyword} nya, goyang parah gedung gue.",
            "Fix ini {keyword} paling kenceng yang pernah gue rasain tahun ini."
        ]
    },
    {
        id: "TIMNAS", // Topik Olahraga (Pride & Critique)
        keywords: ["Timnas Indonesia", "Skuad Garuda", "Shin Tae-yong", "Pemain Naturalisasi", "King Indo"],
        hashtags: ["#TimnasDay", "#KitaGaruda", "#AFC", "#PialaAsia"],
        contexts: [
            "Merinding liat perjuangan {keyword} malam ini, mental baja!",
            "Coach STY emang racikannya gak obat buat {keyword}.",
            "Menyala abangkuh! {keyword} mainnya udah level Eropa.",
            "Wasitnya agak lain sih, tapi {keyword} tetep fight abis-abisan.",
            "Gak sia-sia begadang, {keyword} bener-bener bikin bangga.",
            "Full senyum liat {keyword} bantai lawan, kelas banget mainnya.",
            "Kritik boleh, tapi {keyword} butuh dukungan kita sekarang.",
            "Optimis {keyword} bisa lolos piala dunia kalo mainnya gini terus."
        ]
    },
    {
        id: "KPOP", // Topik Hiburan (Fangirling/Fanboying) - BARU
        keywords: ["Ghibli", "Naruto", "War Tiket", "Attack on Titan", "Fandom"],
        hashtags: ["#NCTDream", "#TheDreamShow3", "#KpopIndo", "#TicketWar"],
        contexts: [
            "Nangis banget gak dapet tiket {keyword}, calo meresahkan woy!",
            "Siap-siap ginjal aman demi {keyword} bulan depan.",
            "Visual {keyword} di real life emang gak masuk akal, cakep banget.",
            "Tolong info jastip {keyword} yang trusted dong, desperate nih.",
            "Capek banget ikut {keyword} tapi server down terus, emosi!",
            "Sumpah {keyword} kali ini setlist lagunya pecah banget.",
            "Gak sabar ketemu bias di {keyword}, see you di venue guys!",
            "Mental breakdown gara-gara gagal nonton {keyword} huhuhu."
        ]
    },
    {
        id: "TECH", // Topik Gadget (Review/Hype) - BARU
        keywords: ["iPhone 16", "Samsung S24", "Fitur AI", "HP Flagship", "Gadget Baru"],
        hashtags: ["#AppleEvent", "#SamsungUnpacked", "#TechReview", "#Gadget"],
        contexts: [
            "Boncos dah tabungan liat harga {keyword} yang baru rilis.",
            "Mending beli motor gak sih daripada beli {keyword}? Mahal bener.",
            "Kameranya {keyword} gila sih, zoom 100x masih jernih.",
            "Fitur AI di {keyword} ngebantu banget buat kerjaan, worth it lah.",
            "Bingung mau upgrade ke {keyword} atau nunggu seri tahun depan.",
            "Desain {keyword} gitu-gitu aja perasaan, gak ada inovasi.",
            "FOMO banget orang-orang pada beli {keyword}, padahal spek biasa aja.",
            "Review jujur {keyword} setelah pemakaian seminggu: Baterai awet parah."
        ]
    },
    {
        id: "GEOPOLITIK", // Topik Berat (Concern)
        keywords: ["Konflik Timur Tengah", "Perang Dunia", "Harga Minyak", "Ekonomi Global"],
        hashtags: ["#WorldNews", "#Geopolitik", "#SaveHumanity"],
        contexts: [
            "Ngeri banget liat berita {keyword} makin memanas di TV.",
            "Efek {keyword} pasti bakal bikin harga barang naik semua nih.",
            "Semoga para pemimpin dunia bisa ngeredam {keyword} secepatnya.",
            "Kita cuma bisa berdoa semoga {keyword} gak makin meluas.",
            "Analisis pengamat soal {keyword} bikin overthinking malem-malem.",
            "Dampak {keyword} kerasa banget ke nilai tukar rupiah hari ini."
        ]
    }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateNaturalContent() {
    // 1. Pilih Topik
    const topic = getRandom(TOPICS);
    
    // 2. Pilih Keyword & Template
    let keyword = getRandom(topic.keywords);
    const template = getRandom(topic.contexts);
    
    // 3. Naturalisasi: Random Casing (Kadang huruf kecil semua biar natural)
    if (Math.random() > 0.5) {
        keyword = keyword.toLowerCase();
    }

    let content = template.replace("{keyword}", keyword);

    // 4. LOGIKA HASHTAG (Lebih Jarang Biar Natural)
    // 80% Tanpa Hashtag, 20% Pakai Hashtag
    if (Math.random() > 0.8) { 
        const tag = getRandom(topic.hashtags);
        content += ` ${tag}`;
    }

    return content;
}

async function runMixTrendingBot() {
    console.log(`🌐 MEMULAI OPERASI NATURAL TRENDING (V2)`);
    console.log(`🎯 Target: ${TOTAL_POSTS} Postingan Variatif`);
    console.log(`📚 Topik: Gempa, Timnas, K-Pop, Tech, Geopolitik`);
    
    const config = {
        headers: { 'X-Internal-Bypass': BYPASS_KEY }
    };

    let successCount = 0;

    for (let i = 0; i < TOTAL_POSTS; i++) {
        // Generate Username yang lebih "Alay/Unik"
        const suffixes = ["_official", "123", "chan", "lovers", "_real", "daily"];
        const names = ["rizky", "siti", "budi", "anya", "kevin", "putri", "alex", "fani"];
        
        const name = getRandom(names);
        const suffix = getRandom(suffixes);
        const randomNum = Math.floor(Math.random() * 1000);
        
        const username = `${name}${suffix}${randomNum}`;
        const email = `${username}@botmail.com`;

        const postContent = generateNaturalContent();

        try {
            // 1. REGISTER
            // Kita bungkus di try-catch terpisah, kalau user udah ada, lanjut login
            try {
                await axios.post(`${API_URL}/auth/register`, { 
                    username, email, password: 'password123' 
                }, config);
            } catch (regErr) {
                // Ignore if user already exists
            }

            // 2. LOGIN
            const loginRes = await axios.post(`${API_URL}/auth/login`, { 
                email, password: 'password123' 
            }, config);

            const botToken = loginRes.data.token;

            // 3. POSTING
            await axios.post(`${API_URL}/posts`, 
                { content: postContent }, 
                { 
                    headers: { 
                        'Authorization': `Bearer ${botToken}`,
                        'X-Internal-Bypass': BYPASS_KEY 
                    } 
                }
            );

            successCount++;
            console.log(`✅ [${successCount}/${TOTAL_POSTS}] @${username}: "${postContent}"`);
            
            await sleep(DELAY_MS);

        } catch (e) {
            console.log(`⚠️ Skip: ${e.message}`);
        }
    }

    console.log(`\n🎉 SELESAI!`);
    console.log(`Silakan cek Frontend. Topik K-Pop, Timnas, atau Gempa harusnya naik.`);
}

runMixTrendingBot();