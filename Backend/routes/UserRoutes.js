import express from 'express'
import {AdminRegister, Approval, GetAllUser, GetUser, LoginUser,Logout,RegisterUser} from "../controllers/userController.js"
import Authenticated from "../middlewares/Authenticated.js";
import allowedUsers, { MANAGERS, SUPER_ADMIN } from "../middlewares/Authorization.js";

const router = express.Router();

router.post('/register', RegisterUser);
router.post('/login', LoginUser);
router.post('/logout', Logout);

router.get('/user/:id', Authenticated(), GetUser);

// User administration.
router.get('/getAllUser', Authenticated(), allowedUsers(...MANAGERS), GetAllUser);
router.post('/approval/:userStatus/:id', Authenticated(), allowedUsers(...MANAGERS), Approval);
router.post('/adminRegister', Authenticated(), allowedUsers(...SUPER_ADMIN), AdminRegister);

export default router;
