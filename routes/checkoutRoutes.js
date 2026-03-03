const express = require("express");
const Checkout = require("../models/Checkout");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();


// @route POST /api/checkout
// @desc Create a new checkout session
// @access Private
router.post("/", protect, async (req, res) => {
  const { checkoutItems, shippingAddress, paymentMethod, totalPrice } =
    req.body;

  if (!checkoutItems || checkoutItems.length === 0) {
    return res.status(400).json({ message: "no items in checkout" });
  }

  try {
    const newCheckout = await Checkout.create({
      user: req.user._id,
      checkoutItems,
      shippingAddress,
      paymentMethod,
      totalPrice,
      paymentStatus: "Pending",
      isPaid: false,
    });

    console.log(`Checkout created for user: ${req.user._id}`);
    res.status(201).json(newCheckout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


// @route PUT /api/checkout/:id/pay
// @desc Update checkout to mark as paid
// @access Private
router.put("/:id/pay", protect, async (req, res) => {
  const { paymentStatus, paymentDetails } = req.body;

  try {
    const checkout = await Checkout.findById(req.params.id);

    if (!checkout) {
      return res
        .status(404)
        .json({ message: "Checkout not found" });
    }

    if (paymentStatus === "paid") {
      checkout.isPaid = true;
      checkout.paidAt = Date.now();
      checkout.paymentStatus = "paid";
      checkout.paymentDetails = paymentDetails;

      await checkout.save();
    }

    res.status(200).json(checkout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


// @route POST /api/checkout/:id/finalize
// @desc Finalize checkout and convert to order
// @access Private
router.post("/:id/finalize", protect, async (req, res) => {
  try {
    const checkout = await Checkout.findById(req.params.id);

    if (!checkout) {
      return res
        .status(404)
        .json({ message: "Checkout not found" });
    }

    if (checkout.isPaid && !checkout.isFinalized) {
      // Create the final Order based on the checkout details
      const finalOrder = await Order.create({
        user: checkout.user,
        orderItems: checkout.checkoutItems,
        shippingAddress: checkout.shippingAddress,
        paymentMethod: checkout.paymentMethod,
        totalPrice: checkout.totalPrice,
        isPaid: true,
        paidAt: checkout.paidAt,
        isDelivered: false,
        paymentStatus: "paid",
        paymentDetails: checkout.paymentDetails,
      });

      // mark the checkout as finalized
      checkout.isFinalized = true;
      checkout.finalizedAt = Date.now();
      await checkout.save();

      // delete user cart
      await Cart.findOneAndDelete({ user: checkout.user });

      return res.status(201).json(finalOrder);

    } else if (checkout.isFinalized) {
      return res
        .status(400)
        .json({ message: "Checkout already finalized" });
    } else {
      return res
        .status(400)
        .json({ message: "Checkout is not paid" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


// ✅ EXPORT ROUTER
module.exports = router;