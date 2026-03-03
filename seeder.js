const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Product = require("./models/Product");
const User = require("./models/User");
const Cart = require("./models/Cart");
const products = require("./data/products");

dotenv.config();

const seedData = async () => {
  try {

    // ✅ Connect DB
    await mongoose.connect(process.env.MONGO_URL);

    console.log("MongoDB Connected");

    // ✅ Clear existing data
    await Product.deleteMany();
    await User.deleteMany();
    await Cart.deleteMany();

    // ✅ Create Admin User
    const createdUser = await User.create({
      name: "Admin User",
      email: "admin@gmail.com",
      password: "123456",
      role: "admin",
    });

    const userID = createdUser._id;

    // ✅ Attach admin to products
    const sampleProducts = products.map((product) => ({
      ...product,
      user: userID,
    }));

    // ✅ Insert Products
    await Product.insertMany(sampleProducts);

    console.log("✅ Product data seeded successfully!");

    process.exit();

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();