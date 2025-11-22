const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get("/", authenticateToken, taskController.getAllTasks);
router.get("/:id", authenticateToken, taskController.getTaskById);
router.get("/user/:userId", authenticateToken, taskController.getTasksByUser);
router.post("/", authenticateToken, taskController.createTask);
router.put("/:id", authenticateToken, taskController.updateTask);
router.delete("/:id", authenticateToken, taskController.deleteTask);

module.exports = router;
