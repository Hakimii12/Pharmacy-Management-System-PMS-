import express from 'express'
import {AdminRegister, Approval, GetUser, LoginUser,Logout,RegisterUser} from "../controllers/userController.js"
import Authenticated from "../middlewares/Authenticated.js";
import Authorization from "../middlewares/Authorization.js"
const router = express.Router();
router.post('/register', RegisterUser);
router.post('/login', LoginUser);
router.get('/user/:id',Authenticated(),Authorization('admin'), GetUser);
router.post('/adminRegister', Authenticated(),Authorization('admin'), AdminRegister);
router.post('/logout',Authenticated(), Logout);
router.post('/approval/:userStatus/:id', Authenticated(),Authorization('admin'), Approval);
export default router;