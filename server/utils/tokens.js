import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
};

export const signToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      subject: user._id.toString(),
      expiresIn: "7d",
    }
  );

export const verifyToken = (token) => jwt.verify(token, getJwtSecret());
