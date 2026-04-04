import User from "../models/User.js";
import { verifyToken } from "../utils/tokens.js";

const getBearerToken = (authorization = "") => {
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
};

const loadUserFromToken = async (authorization) => {
  const token = getBearerToken(authorization);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  const user = await User.findById(payload.sub).lean();

  if (!user || user.isActive === false) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    isActive: user.isActive,
  };
};

export const attachOptionalUser = async (req, _res, next) => {
  try {
    req.user = await loadUserFromToken(req.headers.authorization);
  } catch {
    req.user = null;
  }

  next();
};

export const requireAuth = async (req, res, next) => {
  try {
    const user = await loadUserFromToken(req.headers.authorization);

    if (!user) {
      return res.status(401).json({ message: "Session is no longer valid." });
    }

    req.user = user;

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid authentication token." });
  }
};

export const requireRoles = (...roles) => {
  const allowedRoles = new Set(roles);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!allowedRoles.has(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this resource." });
    }

    return next();
  };
};
