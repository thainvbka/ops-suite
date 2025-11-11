import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/jwt.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      code: "Unauthorized",
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    return next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({
        code: "Unauthorized",
        message: "Token has expired",
      });
    } else if (error instanceof JsonWebTokenError) {
      return res.status(401).json({
        code: "Unauthorized",
        message: "Invalid token",
      });
    } else {
      return res.status(500).json({
        code: "Server Error",
        message: "Internal server error",
      });
    }
  }
};

export default authenticate;
