import { Router } from "express";
import { RegisterUser, getAllUsers } from "../Usercontroller/UserController";
import passport from "../config/passpord.js"
const router=Router()
router.post("/create",RegisterUser)
router.get("/all",getAllUsers)

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.json({ message: "Google login success", user: req.user })
);

router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get("/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => res.json({ message: "GitHub login success", user: req.user })
);
export default router