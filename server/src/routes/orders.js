// server/src/routes/orders.js
const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

// GET /api/v1/orders - List & filter with pagination
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "25", 10);
    const status = req.query.status ? req.query.status.trim() : null;
    const search = req.query.search ? req.query.search.trim() : null;
    const skip = (page - 1) * limit;

    const where = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { wooCreatedAt: "desc" },
        include: {
          customer: true,
          _count: { select: { notes: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:id - Order Details with Timeline & Notes
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { fullName: true, email: true, role: true } } },
        },
        events: {
          orderBy: { at: "desc" },
          include: { actor: { select: { fullName: true, email: true, role: true } } },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/orders/:id - Update order status, tracking & push audit event
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier } = req.body;

    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData = {};
    if (status && status !== currentOrder.status) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (carrier !== undefined) updateData.carrier = carrier;

    // Check author profile
    const authorProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    }).catch(() => null);

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });

    // Record order event timeline audit
    if (status && status !== currentOrder.status) {
      await prisma.orderEvent.create({
        data: {
          orderId: id,
          source: "crm",
          fromStatus: currentOrder.status,
          toStatus: status,
          actorId: authorProfile ? authorProfile.userId : null,
        },
      }).catch((e) => console.error("Could not log order event:", e));
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/orders/:id/notes - Add order note
router.post("/:id/notes", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, body, isCustomerVisible = false } = req.body;
    const noteBody = (body || content || "").trim();

    if (!noteBody) {
      return res.status(400).json({ error: "Note body cannot be empty" });
    }

    const authorProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    }).catch(() => null);

    const note = await prisma.note.create({
      data: {
        orderId: id,
        body: noteBody,
        isCustomerVisible: Boolean(isCustomerVisible),
        authorId: authorProfile ? authorProfile.userId : null,
      },
      include: {
        author: { select: { fullName: true, email: true, role: true } },
      },
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
