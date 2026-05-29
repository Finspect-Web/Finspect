const express = require("express");
const {
  getUsers,
  createUser,
  updateUser,
  handleResetPassword,
  deactivateUser,
  activateUser,
  deleteUser
} = require("../controllers/users.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

// All user management routes are admin-only
router.get("/", authenticate, authorize("ADMIN"), getUsers);
router.post("/", authenticate, authorize("ADMIN"), createUser);
router.put("/:id", authenticate, authorize("ADMIN"), updateUser);
router.patch("/:id/reset-password", authenticate, authorize("ADMIN"), handleResetPassword);
router.patch("/:id/deactivate", authenticate, authorize("ADMIN"), deactivateUser);
router.patch("/:id/activate", authenticate, authorize("ADMIN"), activateUser);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteUser);

module.exports = router;
