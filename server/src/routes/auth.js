const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

// GET /api/v1/auth/me - Returns validated profile and RBAC role
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      select: {
        userId: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return res.json({
        userId: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName || req.user.email.split("@")[0],
        role: req.user.role || "agent",
      });
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
