// server/src/routes/customers.js
const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../config/prisma");

// GET /api/v1/customers - Search & list with pagination
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "25", 10);
    const search = req.query.search ? req.query.search.trim() : "";
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { orders: true, notes: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/customers/:id - Customer 360 View
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { wooCreatedAt: "desc" },
          take: 20,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { fullName: true, email: true, role: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { template: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/customers/:id/notes - Add Customer Note
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
        customerId: id,
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

// PATCH /api/v1/customers/:id - Update tags & details
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags, marketingOptIn, phone, firstName, lastName } = req.body;

    const data = {};
    if (Array.isArray(tags)) data.tags = tags;
    if (typeof marketingOptIn === "boolean") data.marketingOptIn = marketingOptIn;
    if (phone !== undefined) data.phone = phone;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
