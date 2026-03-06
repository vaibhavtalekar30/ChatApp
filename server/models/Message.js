import mongoose from "mongoose";


const messageSchema = mongoose.Schema(
{
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  content: {
    type: String,
  },

  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
  },

  seen: {
    type: Boolean,
    default: false
  },

  seenAt: {
    type: Date
  }

},
{ timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;