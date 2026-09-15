const bcrypt = require("bcrypt");
const prisma = require("../utils/prisma");
const { signToken } = require("../utils/jwt");

const SALT_ROUNDS = 12;

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const passwordSelect = {
  ...userSelect,
  passwordHash: true,
};

const normaliseRegistrationInput = (body = {}) => ({
  name: typeof body.name === "string" ? body.name.trim() : "",
  email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
  password: typeof body.password === "string" ? body.password : "",
  phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
});

const validateRegistration = ({ name, email, password }) => {
  if (name.length < 2 || name.length > 100) {
    return "Name must be between 2 and 100 characters";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "A valid email address is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  return null;
};

const register = async (req, res, next) => {
  try {
    const input = normaliseRegistrationInput(req.body);
    const validationError = validateRegistration(input);

    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

    if (existingUser) {
      return res.status(409).json({ status: "error", message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "CITIZEN",
      },
      select: userSelect,
    });

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      token: signToken(user),
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: passwordSelect });
    const isPasswordValid = user && (await bcrypt.compare(password, user.passwordHash));

    if (!isPasswordValid) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ status: "error", message: "This user account is inactive" });
    }

    const { passwordHash, ...safeUser } = user;

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token: signToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = (req, res) => {
  res.status(200).json({
    status: "success",
    user: req.user,
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
};
