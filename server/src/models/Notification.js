import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Notification title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        message: {
            type: String,
            required: [true, "Notification message is required"],
            trim: true,
            maxlength: [500, "Message cannot exceed 500 characters"],
        },
        type: {
            type: String,
            enum: [
                "WORKER_UPDATED",
                "WORKER_DELETED",
                "DYEHOUSE_UPDATED",
                "DYEHOUSE_DELETED",
                "USER_UPDATED",
                "USER_DELETED",
                "MATERIAL_DELETED",
                "TRANSFER_DELETED",
                "TRANSFER_RETURNED",
                "USER_LOGIN",
                "SOFT_HANK_DELETED",
            ],
            required: [true, "Notification type is required"],
        },
        targetRoles: [
            {
                type: String,
                enum: ["DIRECTOR", "MANAGER"],
            },
        ],
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        entityId: {
            type: String,
            required: true,
        },
        entityName: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
notificationSchema.index({ targetRoles: 1, createdAt: -1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual to check if notification is read by a specific user
notificationSchema.methods.isReadBy = function (userId) {
    return this.readBy.some((id) => id.toString() === userId.toString());
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
