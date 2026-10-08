#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║          REACTLY ADMIN CONSOLE (CLI)                ║
 * ║  Manage users, posts, data langsung dari terminal   ║
 * ╚══════════════════════════════════════════════════════╝
 * 
 * Usage: node admin.js
 * Jalankan dari folder: server/
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const readline = require('readline');

// ── Models ──────────────────────────────────────────────
const User         = require('./models/User');
const Post         = require('./models/Post');
const Comment      = require('./models/Comment');
const Notification = require('./models/Notification');

// ── Colors (ANSI) ───────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bright: '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
  bgRed:  '\x1b[41m',
  bgBlue: '\x1b[44m',
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

// ── Helpers ─────────────────────────────────────────────
const ok  = (msg) => console.log(`${C.green}✔ ${msg}${C.reset}`);
const err = (msg) => console.log(`${C.red}✘ ${msg}${C.reset}`);
const info= (msg) => console.log(`${C.cyan}ℹ ${msg}${C.reset}`);
const warn= (msg) => console.log(`${C.yellow}⚠ ${msg}${C.reset}`);
const sep = ()    => console.log(`${C.gray}${'─'.repeat(55)}${C.reset}`);
const hr  = ()    => console.log(`${C.blue}${'═'.repeat(55)}${C.reset}`);

function badge(user) {
  const v   = user.isVerified ? `${C.blue}✔${C.reset}` : ' ';
  const adm = user.isAdmin    ? `${C.yellow}[ADMIN]${C.reset}` : '';
  const prv = user.isPrivate  ? `${C.gray}[PRIVATE]${C.reset}` : '';
  return `${v} ${C.bright}@${user.username}${C.reset} (${user.fullName || '-'}) ${adm}${prv}`;
}

// ── Main Menu ────────────────────────────────────────────
async function mainMenu() {
  hr();
  console.log(`${C.bright}${C.blue}  REACTLY ADMIN CONSOLE${C.reset}`);
  hr();
  console.log(`
  ${C.bright}👤 USER MANAGEMENT${C.reset}
  ${C.cyan}1${C.reset}  List semua user
  ${C.cyan}2${C.reset}  Cari user (username/email)
  ${C.cyan}3${C.reset}  Buat akun baru
  ${C.cyan}4${C.reset}  Beri / cabut centang biru (verified)
  ${C.cyan}5${C.reset}  Beri / cabut status Admin
  ${C.cyan}6${C.reset}  Reset password user
  ${C.cyan}7${C.reset}  Hapus user tertentu
  ${C.cyan}8${C.reset}  Info detail user

  ${C.bright}📝 CONTENT MANAGEMENT${C.reset}
  ${C.cyan}9${C.reset}  List post terbaru
  ${C.cyan}10${C.reset} Hapus post tertentu (by ID)
  ${C.cyan}11${C.reset} Hapus semua post user tertentu

  ${C.bright}☢  DANGER ZONE${C.reset}
  ${C.red}20${C.reset} ${C.bgRed} HAPUS SEMUA POST & COMMENT ${C.reset}
  ${C.red}21${C.reset} ${C.bgRed} HAPUS SEMUA USER (kecuali admin) ${C.reset}
  ${C.red}22${C.reset} ${C.bgRed} RESET TOTAL DATABASE (SEMUA DATA) ${C.reset}

  ${C.bright}📊 INFO${C.reset}
  ${C.cyan}99${C.reset} Statistik database
  ${C.cyan}0${C.reset}  Keluar
`);
  const choice = await ask(`${C.bright}Pilih menu: ${C.reset}`);
  return choice.trim();
}

// ════════════════════════════════════════════════════════
// 1. LIST SEMUA USER
// ════════════════════════════════════════════════════════
async function listUsers() {
  sep();
  const users = await User.find().sort({ createdAt: -1 }).limit(50);
  console.log(`${C.bright}Total: ${users.length} user (max tampil 50)${C.reset}\n`);
  users.forEach((u, i) => {
    const followers = u.followers?.length || 0;
    const following = u.following?.length || 0;
    console.log(`  ${C.gray}${String(i+1).padStart(2)}.${C.reset} ${badge(u)}`);
    console.log(`      ${C.gray}${u.email} | Followers: ${followers} | Following: ${following} | ${u.createdAt?.toLocaleDateString('id-ID')}${C.reset}`);
  });
}

// ════════════════════════════════════════════════════════
// 2. CARI USER
// ════════════════════════════════════════════════════════
async function searchUser() {
  const q = await ask('Masukkan username atau email: ');
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email:    { $regex: q, $options: 'i' } },
      { fullName: { $regex: q, $options: 'i' } }
    ]
  }).limit(20);

  if (!users.length) return warn('Tidak ada user yang cocok.');
  users.forEach((u, i) => {
    console.log(`  ${i+1}. ${badge(u)} — ${u.email}`);
  });
}

// ════════════════════════════════════════════════════════
// 3. BUAT AKUN BARU
// ════════════════════════════════════════════════════════
async function createAccount() {
  sep();
  console.log(`${C.bright}Buat Akun Baru${C.reset}`);
  const username = await ask('Username    : ');
  const email    = await ask('Email       : ');
  const fullName = await ask('Full Name   : ');
  const password = await ask('Password    : ');
  const isAdmin  = (await ask('Admin? (y/N): ')).toLowerCase() === 'y';
  const isVerified=(await ask('Verified? (y/N): ')).toLowerCase() === 'y';

  if (!username || !email || !password) return err('Username, email, dan password wajib diisi!');

  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) return err(`Username atau email sudah dipakai oleh @${exists.username}`);

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    fullName,
    password: hashed,
    isAdmin,
    isVerified,
  });
  await user.save();
  ok(`Akun @${user.username} berhasil dibuat! ID: ${user._id}`);
  if (isVerified) info('Centang biru ✔ aktif.');
  if (isAdmin) info('Status Admin aktif.');
}

// ════════════════════════════════════════════════════════
// 4. TOGGLE VERIFIED (CENTANG BIRU)
// ════════════════════════════════════════════════════════
async function toggleVerified() {
  const q = await ask('Username atau email: ');
  const user = await User.findOne({
    $or: [{ username: q }, { email: q }]
  });
  if (!user) return err('User tidak ditemukan.');

  user.isVerified = !user.isVerified;
  await user.save();

  // Sync ke semua Post milik user ini
  await Post.updateMany({ userId: user._id }, { isVerified: user.isVerified });

  if (user.isVerified) {
    ok(`@${user.username} sekarang punya centang biru ✔`);
  } else {
    warn(`Centang biru @${user.username} dicabut.`);
  }
}

// ════════════════════════════════════════════════════════
// 5. TOGGLE ADMIN
// ════════════════════════════════════════════════════════
async function toggleAdmin() {
  const q = await ask('Username: ');
  const user = await User.findOne({ username: q });
  if (!user) return err('User tidak ditemukan.');

  user.isAdmin = !user.isAdmin;
  await user.save();
  ok(`@${user.username} isAdmin → ${user.isAdmin}`);
}

// ════════════════════════════════════════════════════════
// 6. RESET PASSWORD
// ════════════════════════════════════════════════════════
async function resetPassword() {
  const q = await ask('Username: ');
  const user = await User.findOne({ username: q });
  if (!user) return err('User tidak ditemukan.');

  const newPass = await ask('Password baru: ');
  if (!newPass || newPass.length < 4) return err('Password terlalu pendek (min 4 karakter).');

  user.password = await bcrypt.hash(newPass, 10);
  await user.save();
  ok(`Password @${user.username} berhasil direset.`);
}

// ════════════════════════════════════════════════════════
// 7. HAPUS USER TERTENTU
// ════════════════════════════════════════════════════════
async function deleteUser() {
  const q = await ask('Username yang akan dihapus: ');
  const user = await User.findOne({ username: q });
  if (!user) return err('User tidak ditemukan.');

  console.log(`\n  ${badge(user)}`);
  const confirm = await ask(`${C.red}Yakin hapus user ini beserta semua postnya? (ketik "hapus"): ${C.reset}`);
  if (confirm !== 'hapus') return warn('Dibatalkan.');

  const postCount    = await Post.countDocuments({ userId: user._id });
  const commentCount = await Comment.countDocuments({ userId: user._id });

  await Post.deleteMany({ userId: user._id });
  await Comment.deleteMany({ userId: user._id });
  await Notification.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] });
  await User.deleteOne({ _id: user._id });

  ok(`@${user.username} dihapus. ${postCount} post, ${commentCount} comment ikut dihapus.`);
}

// ════════════════════════════════════════════════════════
// 8. INFO DETAIL USER
// ════════════════════════════════════════════════════════
async function userDetail() {
  const q = await ask('Username: ');
  const user = await User.findOne({ username: q });
  if (!user) return err('User tidak ditemukan.');

  const postCount    = await Post.countDocuments({ userId: user._id });
  const commentCount = await Comment.countDocuments({ userId: user._id });

  sep();
  console.log(`${badge(user)}`);
  console.log(`  ID        : ${user._id}`);
  console.log(`  Email     : ${user.email}`);
  console.log(`  Full Name : ${user.fullName || '-'}`);
  console.log(`  Bio       : ${user.bio || '-'}`);
  console.log(`  Location  : ${user.location || '-'}`);
  console.log(`  Verified  : ${user.isVerified ? `${C.blue}✔ Ya${C.reset}` : 'Tidak'}`);
  console.log(`  Admin     : ${user.isAdmin    ? `${C.yellow}✔ Ya${C.reset}` : 'Tidak'}`);
  console.log(`  Private   : ${user.isPrivate  ? 'Ya' : 'Tidak'}`);
  console.log(`  Followers : ${user.followers?.length || 0}`);
  console.log(`  Following : ${user.following?.length || 0}`);
  console.log(`  Posts     : ${postCount}`);
  console.log(`  Comments  : ${commentCount}`);
  console.log(`  Joined    : ${user.createdAt?.toLocaleString('id-ID')}`);
}

// ════════════════════════════════════════════════════════
// 9. LIST POST TERBARU
// ════════════════════════════════════════════════════════
async function listPosts() {
  const n = parseInt(await ask('Tampilkan berapa post terakhir? (default 20): ') || '20');
  const posts = await Post.find().sort({ createdAt: -1 }).limit(n)
    .populate('userId', 'username isVerified');
  
  sep();
  posts.forEach((p, i) => {
    const v = p.isVerified ? `${C.blue}✔${C.reset}` : ' ';
    const content = (p.content || '[media/poll]').slice(0, 60);
    console.log(`  ${C.gray}${String(i+1).padStart(2)}.${C.reset} ${v} ${C.bright}@${p.userId?.username || '?'}${C.reset} ${C.gray}${p._id}${C.reset}`);
    console.log(`      ${C.gray}${p.createdAt?.toLocaleString('id-ID')}${C.reset} — ${content}`);
    console.log(`      ${C.cyan}❤ ${p.likes?.length||0}  🔁 ${p.reposts?.length||0}  💬 ${p.comments||0}  👁 ${p.views||0}${C.reset}`);
  });
}

// ════════════════════════════════════════════════════════
// 10. HAPUS POST BY ID
// ════════════════════════════════════════════════════════
async function deletePost() {
  const id = await ask('Post ID: ');
  const post = await Post.findById(id.trim()).populate('userId', 'username');
  if (!post) return err('Post tidak ditemukan.');

  console.log(`\n  @${post.userId?.username}: "${(post.content||'[media]').slice(0,60)}"`);
  const confirm = await ask(`${C.red}Hapus post ini? (y/N): ${C.reset}`);
  if (confirm.toLowerCase() !== 'y') return warn('Dibatalkan.');

  await Post.deleteOne({ _id: id });
  await Comment.deleteMany({ postId: id });
  ok(`Post ${id} dan semua komentarnya dihapus.`);
}

// ════════════════════════════════════════════════════════
// 11. HAPUS SEMUA POST MILIK USER
// ════════════════════════════════════════════════════════
async function deleteUserPosts() {
  const q = await ask('Username: ');
  const user = await User.findOne({ username: q });
  if (!user) return err('User tidak ditemukan.');

  const count = await Post.countDocuments({ userId: user._id });
  warn(`@${user.username} punya ${count} post.`);
  const confirm = await ask(`${C.red}Hapus semua? (ketik "hapus"): ${C.reset}`);
  if (confirm !== 'hapus') return warn('Dibatalkan.');

  const postIds = (await Post.find({ userId: user._id }, '_id')).map(p => p._id);
  await Comment.deleteMany({ postId: { $in: postIds } });
  await Post.deleteMany({ userId: user._id });
  ok(`${count} post @${user.username} dihapus.`);
}

// ════════════════════════════════════════════════════════
// 20. HAPUS SEMUA POST & COMMENT
// ════════════════════════════════════════════════════════
async function nukeAllContent() {
  const postCount    = await Post.countDocuments();
  const commentCount = await Comment.countDocuments();
  const notifCount   = await Notification.countDocuments();

  warn(`Akan menghapus:`);
  console.log(`   ${C.red}${postCount}${C.reset} Post`);
  console.log(`   ${C.red}${commentCount}${C.reset} Comment`);
  console.log(`   ${C.red}${notifCount}${C.reset} Notification`);

  const confirm = await ask(`${C.bgRed}${C.white} Ketik "HAPUS KONTEN" untuk lanjut: ${C.reset} `);
  if (confirm !== 'HAPUS KONTEN') return warn('Dibatalkan.');

  await Notification.deleteMany({});
  await Comment.deleteMany({});
  await Post.deleteMany({});
  ok(`Semua konten dihapus. Database bersih.`);
}

// ════════════════════════════════════════════════════════
// 21. HAPUS SEMUA USER (KECUALI ADMIN)
// ════════════════════════════════════════════════════════
async function nukeAllUsers() {
  const userCount  = await User.countDocuments({ isAdmin: { $ne: true } });
  const adminCount = await User.countDocuments({ isAdmin: true });

  warn(`Akan menghapus ${userCount} user biasa. ${adminCount} admin akan dipertahankan.`);
  const confirm = await ask(`${C.bgRed}${C.white} Ketik "HAPUS USER" untuk lanjut: ${C.reset} `);
  if (confirm !== 'HAPUS USER') return warn('Dibatalkan.');

  await User.deleteMany({ isAdmin: { $ne: true } });
  ok(`${userCount} user dihapus. Admin tetap aman.`);
}

// ════════════════════════════════════════════════════════
// 22. RESET TOTAL DATABASE
// ════════════════════════════════════════════════════════
async function nukeEverything() {
  const u = await User.countDocuments();
  const p = await Post.countDocuments();
  const c = await Comment.countDocuments();
  const n = await Notification.countDocuments();

  console.log(`\n${C.bgRed}${C.white}  ☢  PERINGATAN: OPERASI TIDAK BISA DIBATALKAN!  ☢  ${C.reset}`);
  warn(`Akan menghapus SELURUH data:`);
  console.log(`   ${C.red}${u}${C.reset} User | ${C.red}${p}${C.reset} Post | ${C.red}${c}${C.reset} Comment | ${C.red}${n}${C.reset} Notif`);

  const confirm1 = await ask(`${C.bgRed}${C.white} Ketik "RESET DATABASE" untuk lanjut: ${C.reset} `);
  if (confirm1 !== 'RESET DATABASE') return warn('Dibatalkan.');

  const confirm2 = await ask(`${C.red}Yakin 100%? Ketik "YA SAYA YAKIN": ${C.reset}`);
  if (confirm2 !== 'YA SAYA YAKIN') return warn('Dibatalkan.');

  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  ok(`Database direset total. Semua ${u+p+c+n} dokumen dihapus.`);
}

// ════════════════════════════════════════════════════════
// 99. STATISTIK DATABASE
// ════════════════════════════════════════════════════════
async function showStats() {
  sep();
  const [users, posts, comments, notifs, verified, admins] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments(),
    Notification.countDocuments(),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ isAdmin: true }),
  ]);

  const topPosters = await Post.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
  ]);

  console.log(`${C.bright}📊 STATISTIK DATABASE${C.reset}\n`);
  console.log(`  👤 Users          : ${C.bright}${users}${C.reset}  (${C.blue}✔ ${verified} verified${C.reset}, ${C.yellow}${admins} admin${C.reset})`);
  console.log(`  📝 Posts          : ${C.bright}${posts}${C.reset}`);
  console.log(`  💬 Comments       : ${C.bright}${comments}${C.reset}`);
  console.log(`  🔔 Notifications  : ${C.bright}${notifs}${C.reset}`);

  if (topPosters.length) {
    console.log(`\n  ${C.bright}Top 5 Poster:${C.reset}`);
    topPosters.forEach((t, i) => {
      const u = t.user[0];
      const name = u ? `@${u.username}` : '(deleted)';
      console.log(`    ${i+1}. ${name} — ${t.count} post`);
    });
  }
}

// ════════════════════════════════════════════════════════
// MAIN LOOP
// ════════════════════════════════════════════════════════
async function main() {
  console.clear();
  console.log(`\n${C.cyan}Menghubungkan ke MongoDB...${C.reset}`);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    ok('Terhubung ke MongoDB!\n');
  } catch (e) {
    err(`Gagal koneksi MongoDB: ${e.message}`);
    process.exit(1);
  }

  while (true) {
    try {
      const choice = await mainMenu();

      if (choice === '0')  { info('Sampai jumpa!'); break; }
      if (choice === '1')  await listUsers();
      if (choice === '2')  await searchUser();
      if (choice === '3')  await createAccount();
      if (choice === '4')  await toggleVerified();
      if (choice === '5')  await toggleAdmin();
      if (choice === '6')  await resetPassword();
      if (choice === '7')  await deleteUser();
      if (choice === '8')  await userDetail();
      if (choice === '9')  await listPosts();
      if (choice === '10') await deletePost();
      if (choice === '11') await deleteUserPosts();
      if (choice === '20') await nukeAllContent();
      if (choice === '21') await nukeAllUsers();
      if (choice === '22') await nukeEverything();
      if (choice === '99') await showStats();

      if (!['0'].includes(choice)) {
        await ask(`\n${C.gray}Tekan Enter untuk kembali ke menu...${C.reset}`);
      }
    } catch (e) {
      err(`Error: ${e.message}`);
      await ask(`\n${C.gray}Tekan Enter untuk kembali...${C.reset}`);
    }
  }

  rl.close();
  await mongoose.disconnect();
  process.exit(0);
}

main();
