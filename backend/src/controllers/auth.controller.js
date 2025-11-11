import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import config from "../config/index.js";

export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const newUser = await User.create({ username, email, password, role });

    //tao cap token
    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    console.log("Refresh Token:", refreshToken);

    await Token.create({
      token: refreshToken,
      userId: newUser._id,
    });

    //gửi Refresh Token về client thông qua cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, //Không cho JavaScript phía client truy cập cookie giúp chống XSS (Cross-site scripting).
      secure: config.NODE_ENV === "production", //Chỉ cho gửi cookie qua HTTPS nếu đang chạy môi trường production
      sameSite: "strict", //Cookie chỉ được gửi khi request cùng domain, chống CSRF.
    });

    res.status(201).json({
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
      accessToken: accessToken,
    });
  } catch (error) {
    res.status(500).json({
      code: "Server Error",
      message: "Internal server error",
      error: error,
    });
    console.log(error);
  }
};
