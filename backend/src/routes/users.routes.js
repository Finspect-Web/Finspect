const express = require("express");
const { getUsers } = require("../controllers/users.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.get("/", authenticate, authorize("ADMIN"), getUsers);

module.exports = router;
