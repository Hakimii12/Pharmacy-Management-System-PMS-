import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export const  GenerateToken = (userId, role, res) => {
  const token = jwt.sign(
    { userId:userId.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: "3000h" }
  );
  res.cookie("jwt", token, {
    httpOnly: false,
    maxAge: 3000 * 60 * 60 * 1000,
    sameSite: "None",
    secure: true
  });
  return token;
};
