const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const taskController = require("../controllers/taskController");

router.use(requireAuth);

// Get all tasks across all leads
router.get("/all", taskController.getAllTasks);

// Get all tasks for a lead
router.get("/lead/:leadId", taskController.getTasksForLead);

// Create a new task
router.post("/lead/:leadId", taskController.createTask);

// Update a task
router.put("/:taskId", taskController.updateTask);

// Delete a task
router.delete("/:taskId", taskController.deleteTask);

// Add a comment to a task
router.post("/:taskId/comments", taskController.addComment);

// Delete a comment from a task
router.delete("/:taskId/comments/:commentId", taskController.deleteComment);

module.exports = router;
