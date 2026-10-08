const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

if (isMainThread) {
    // ============================================================================
    // MAIN THREAD: Orchestrator
    // ============================================================================
    require('dotenv').config({ path: path.join(__dirname, '.env') });
    const readline = require('readline');
    const os = require('os');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => rl.question(q, res));

    async function main() {
        console.clear();
        console.log(`\x1b[44m\x1b[37m 🚀 REACTLY MASS SEEDER (MULTI-THREADED) \x1b[0m`);
        console.log(`\x1b[36mGunakan ini untuk stress-test algoritma Trending (AI Engine) dan FYP\x1b[0m\n`);
        
        const numThreadsStr = await ask(`Jumlah Thread (default ${os.cpus().length}): `);
        const numThreads = parseInt(numThreadsStr) || os.cpus().length;
        
        const totalUsersStr = await ask(`Total User baru yg ingin dibuat (default 50): `);
        const totalUsers = parseInt(totalUsersStr) || 50;

        const postsPerUserStr = await ask(`Jumlah post per user (default 10): `);
        const postsPerUser = parseInt(postsPerUserStr) || 10;

        rl.close();

        const usersPerThread = Math.ceil(totalUsers / numThreads);
        console.log(`\n\x1b[33mMemulai ${numThreads} worker threads...\x1b[0m`);
        console.log(`\x1b[33mTarget: ~${usersPerThread * numThreads} Users | ~${usersPerThread * numThreads * postsPerUser} Posts\x1b[0m\n`);
        
        let completed = 0;
        const startTime = Date.now();

        for (let i = 0; i < numThreads; i++) {
            const worker = new Worker(__filename, {
                workerData: {
                    threadId: i + 1,
                    userCount: usersPerThread,
                    postsPerUser: postsPerUser,
                    mongoUri: process.env.MONGO_URI
                }
            });

            worker.on('message', (msg) => {
                if (msg.type === 'log') console.log(`\x1b[90m[Thread-${msg.threadId.toString().padStart(2)}]\x1b[0m ${msg.text}`);
                if (msg.type === 'done') {
                    completed++;
                    if (completed === numThreads) {
                        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                        console.log(`\n\x1b[42m\x1b[30m ✅ SEEDING SELESAI DALAM ${duration} DETIK! \x1b[0m`);
                        console.log(`\x1b[36mCek terminal AI Engine (Python), CPU pasti sedang bekerja keras melakukan clustering NLP.\x1b[0m`);
                        process.exit(0);
                    }
                }
            });

            worker.on('error', (err) => console.error(`Worker error:`, err));
        }
    }
    main();

} else {
    // ============================================================================
    // WORKER THREAD: Melakukan operasi database & redis secara paralel
    // ============================================================================
    async function runWorker() {
        const { threadId, userCount, postsPerUser, mongoUri } = workerData;
        const sendLog = (text) => parentPort.postMessage({ type: 'log', threadId, text });

        // Lazy load modules inside worker
        const Redis = require('ioredis');
        const User = require('./models/User');
        const Post = require('./models/Post');
        
        await mongoose.connect(mongoUri);
        const redis = new Redis(); // default localhost:6379
        
        // Gunakan 1 password hash untuk semua agar cepat (bcrypt memakan banyak CPU)
        const bcrypt = require('bcryptjs');
        const defaultPassword = await bcrypt.hash('password123', 10);

        // Template Topik agar AI NLP (spaCy + SentenceTransformers) bisa melakukan clustering
        const TOPICS = {
            Teknologi: ["Review iPhone 16 Pro Max", "Samsung S24 Ultra kameranya gila", "ChatGPT AI bakal menggantikan programmer", "MacBook Pro M4 mending mana", "Belajar coding javascript dan python"],
            Olahraga: ["Timnas Indonesia main bagus banget", "Shin Tae Yong taktiknya mantap", "Hasil liga inggris semalam", "Ronaldo cetak gol lagi", "Piala asia seru banget"],
            Anime: ["Jujutsu Kaisen chapter terbaru sedih", "Kapan anime one piece tamat ya", "Attack on Titan endingnya gila", "Rekomendasi anime isekai", "Demon Slayer season baru keren"],
            Politik: ["Kawal pemilu dan pilpres tahun ini", "Debat capres semalam seru banget", "Kebijakan pemerintah soal pajak", "Isu korupsi terbaru", "Situasi politik indonesia saat ini"],
            Hiburan: ["Konser Coldplay di jakarta pecah", "Review film drakor Queen of Tears", "Lagu baru Taylor Swift enak banget", "Gosip artis viral hari ini", "Rekomendasi film bioskop minggu ini"]
        };
        const categories = Object.keys(TOPICS);

        sendLog(`Mulai membuat ${userCount} users...`);
        const createdUsers = [];
        
        for (let i = 0; i < userCount; i++) {
            const r = crypto.randomBytes(4).toString('hex');
            const user = new User({
                username: `bot_${threadId}_${r}`,
                email: `bot_${threadId}_${r}@test.com`,
                fullName: `Test Bot ${threadId}-${r}`,
                password: defaultPassword,
                isVerified: Math.random() > 0.8,
                bio: `Akun test hasil generator thread ${threadId}`
            });
            createdUsers.push(user);
        }
        await User.insertMany(createdUsers);
        sendLog(`Berhasil insert ${userCount} users.`);

        sendLog(`Mulai membuat ${userCount * postsPerUser} posts & streaming ke Redis...`);
        const createdPosts = [];
        
        for (const user of createdUsers) {
            for (let p = 0; p < postsPerUser; p++) {
                const cat = categories[Math.floor(Math.random() * categories.length)];
                const phrases = TOPICS[cat];
                const baseText = phrases[Math.floor(Math.random() * phrases.length)];
                const randomHash = crypto.randomBytes(3).toString('hex');
                const content = `${baseText} #${randomHash}`;

                const post = new Post({
                    userId: user._id,
                    author: user.fullName,
                    handle: `@${user.username}`,
                    avatar: `https://i.pravatar.cc/150?u=${user.username}`,
                    isVerified: user.isVerified,
                    content: content,
                    category: cat,
                    likes: [],
                    reposts: [],
                    comments: 0,
                    views: Math.floor(Math.random() * 500)
                });
                createdPosts.push(post);

                // 1. FYP: Build User Interest (Bot ini posting soal kategori tsb -> minat++)
                await redis.hincrby(`user:interest:${user._id}`, cat, 3);

                // 2. TRENDING: Push ke Redis Stream (Langsung masuk queue Python AI)
                const payload = {
                    id: post._id.toString(),
                    text: content,
                    user_id: user._id.toString(),
                    type: 'post',
                    created_at: new Date().toISOString()
                };
                await redis.xadd('post_stream', 'MAXLEN', '~', 20000, '*', 'data', JSON.stringify(payload));
            }
        }
        await Post.insertMany(createdPosts);
        sendLog(`Berhasil membuat post dan menembakkan ke stream.`);

        sendLog(`Simulasi engagement (Likes) agar FYP dan Trending semakin hidup...`);
        const bulkPostUpdates = [];

        for (const post of createdPosts) {
            // 40% kemungkinan post ini viral (banyak like)
            if (Math.random() > 0.6) {
                const likersCount = Math.floor(Math.random() * Math.min(15, createdUsers.length));
                const likers = [];
                for (let l = 0; l < likersCount; l++) {
                    const randomLiker = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                    if (!likers.includes(randomLiker._id)) {
                        likers.push(randomLiker._id);
                        
                        // Push Like ke stream (Trending engine merespons velocity interaksi)
                        const payloadLike = {
                            id: post._id.toString(),
                            text: post.content,
                            user_id: randomLiker._id.toString(),
                            type: 'like',
                            created_at: new Date().toISOString()
                        };
                        redis.xadd('post_stream', 'MAXLEN', '~', 20000, '*', 'data', JSON.stringify(payloadLike));
                    }
                }
                
                bulkPostUpdates.push({
                    updateOne: {
                        filter: { _id: post._id },
                        update: { $set: { likes: likers } }
                    }
                });
            }
        }

        if (bulkPostUpdates.length > 0) {
            await Post.bulkWrite(bulkPostUpdates);
        }

        sendLog(`Selesai! Disconnecting...`);
        await mongoose.disconnect();
        redis.quit();
        
        parentPort.postMessage({ type: 'done', threadId });
    }

    runWorker();
}
