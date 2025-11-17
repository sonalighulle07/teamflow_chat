// backend/routes/taskRoutes.js
const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Get all tasks
router.get("/", authenticateToken, taskController.getAllTasks);

// Get task by id
router.get("/:id", authenticateToken, taskController.getTaskById);

// Get tasks assigned to a specific user
router.get("/user/:userId", authenticateToken, taskController.getTasksByUser);

// Create a new task
router.post("/", authenticateToken, taskController.createTask);

// Update task
router.put("/:id", authenticateToken, taskController.updateTask);

// Delete task
router.delete("/:id", authenticateToken, taskController.deleteTask);

module.exports = router;
