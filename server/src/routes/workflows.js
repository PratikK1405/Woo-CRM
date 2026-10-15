// server/src/routes/workflows.js
const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

// Both admin and agent can read workflows
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
    }).catch(() => []);
    res.json({ data: workflows });
  } catch (err) {
    next(err);
  }
});

// RBAC: Only Admin can create, toggle or delete workflows
router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { name, description, triggerType, delayMinutes, enabled, conditions, actions } = req.body;
    const created = await prisma.workflow.create({
      data: {
        name: name || "Untitled Workflow",
        description: description || "",
        triggerType: triggerType || "order_created",
        delayMinutes: typeof delayMinutes === "number" ? delayMinutes : 0,
        enabled: enabled ?? true,
        conditions: conditions || [],
        actions: actions || [],
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabled, name, description, triggerType, delayMinutes, conditions, actions } = req.body;
    const updateData = {};
    if (typeof enabled === "boolean") updateData.enabled = enabled;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (typeof delayMinutes === "number") updateData.delayMinutes = delayMinutes;
    if (conditions !== undefined) updateData.conditions = conditions;
    if (actions !== undefined) updateData.actions = actions;

    const updated = await prisma.workflow.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.workflow.delete({ where: { id } });
    res.json({ success: true, message: "Workflow deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
