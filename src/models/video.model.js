import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // For Aggregation Queries

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // cloudinary url
            required: true,
        },
        thumbnail: {
            type: String, // cloudinary url
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        visibility: {
            type: String,
            enum: ["public", "private", "unlisted"],
            default: "public",
        },
        category: {
            type: String,
            required: true,
            // Optional: Add enum if you want predefined categories
            // enum: ['education', 'music', 'comedy', 'gaming', 'vlog', ...]
        },
        tags: {
            type: [String],
            default: [],
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
