const express = require("express");
const { login, register, signup } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/register", authenticate, authorize("ADMIN"), register);

module.exports = router;
