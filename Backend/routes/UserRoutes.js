import express from 'express'
import {GetUser, LoginUser,RegisterUser} from "../controllers/userController.js"
const router = express.Router();
router.post('/register', RegisterUser);
router.post('/login', LoginUser);
router.get('/user/:id', GetUser);
export default router;