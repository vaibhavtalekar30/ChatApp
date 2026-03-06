import User from "../models/User.js";

export const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          username: { $regex: req.query.search, $options: "i" }
        }
      : {};

    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user._id } }) // exclude logged in user
      .select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
};