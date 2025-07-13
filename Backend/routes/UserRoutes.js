import express from 'express'
import {AdminRegister, Approval, GetAllUser, GetUser, LoginUser,Logout,RegisterUser} from "../controllers/userController.js"
import Authenticated from "../middlewares/Authenticated.js";
import Authorization from "../middlewares/Authorization.js";
const router = express.Router();
router.post('/register', RegisterUser);
router.post('/login', LoginUser);
router.get('/user/:id',Authenticated(), GetUser);
router.post('/adminRegister', Authenticated(), AdminRegister);
router.post('/logout', Logout);
router.post('/approval/:userStatus/:id', Authenticated(), Approval);
router.get('/getAllUser',Authenticated(),GetAllUser)
export default router;