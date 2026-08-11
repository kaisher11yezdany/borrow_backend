const Task = require("../models/Task");
const Lead = require("../models/Lead");

async function getAllTasks(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "", priority = "" } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { "lead.customerName": { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate("leadId")
      .populate("createdBy", "name email")
      .populate("comments.by", "name email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Map leadId to lead in response
    const tasksWithLead = tasks.map((task) => ({
      ...task.toObject(),
      lead: task.leadId,
    }));

    res.json({ tasks: tasksWithLead, total, totalPages, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTasksForLead(req, res) {
  try {
    const { leadId } = req.params;
    const tasks = await Task.find({ leadId })
      .populate("createdBy", "name email")
      .populate("comments.by", "name email")
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createTask(req, res) {
  try {
    const { leadId } = req.params;
    const { title, description, status, priority, dueDate } = req.body;
    const userId = req.user._id;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const task = new Task({
      leadId,
      title,
      description,
      status: status || "Not Started",
      priority: priority || "Medium",
      dueDate,
      createdBy: userId,
    });

    await task.save();
    await task.populate("createdBy", "name email");

    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, dueDate } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      { title, description, status, priority, dueDate },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("comments.by", "name email");

    if (!task) return res.status(404).json({ error: "Task not found" });

    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTask(req, res) {
  try {
    const { taskId } = req.params;
    const task = await Task.findByIdAndDelete(taskId);

    if (!task) return res.status(404).json({ error: "Task not found" });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addComment(req, res) {
  try {
    const { taskId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.comments.push({
      text,
      by: userId,
      at: new Date(),
    });

    await task.save();
    await task.populate("comments.by", "name email");

    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteComment(req, res) {
  try {
    const { taskId, commentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.comments = task.comments.filter((c) => c._id.toString() !== commentId);
    await task.save();

    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllTasks,
  getTasksForLead,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  deleteComment,
};
