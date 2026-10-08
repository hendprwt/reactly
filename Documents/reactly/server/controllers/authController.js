const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- REGISTER ---
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Cek duplikat
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Simpan User
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- LOGIN ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cek User
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Cek Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Buat Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "rahasia_negara", { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};