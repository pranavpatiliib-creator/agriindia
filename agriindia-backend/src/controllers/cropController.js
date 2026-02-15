// controllers/cropController.js

const Crop = require("../models/Crop");

// ✅ GET All Crops (Pagination + Filtering + Search)
exports.getAllCrops = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, season, crop_type, name } = req.query;

        const queryObject = {};

        // Filtering
        if (season) queryObject.season = season;
        if (crop_type) queryObject.crop_type = crop_type;

        // Search (case-insensitive)
        if (name) {
            queryObject.name = { $regex: name, $options: "i" };
        }

        const skip = (page - 1) * limit;

        const total = await Crop.countDocuments(queryObject);

        const crops = await Crop.find(queryObject)
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            totalRecords: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            data: crops,
        });
    } catch (error) {
        next(error);
    }
};

// ✅ GET Crop By Name
exports.getCropByName = async (req, res, next) => {
    try {
        const crop = await Crop.findOne({
            name: { $regex: req.params.name, $options: "i" },
        });

        if (!crop) {
            return res.status(404).json({
                success: false,
                message: "Crop not found",
            });
        }

        res.status(200).json({
            success: true,
            data: crop,
        });
    } catch (error) {
        next(error);
    }
};

// ✅ Add Crop
exports.addCrop = async (req, res, next) => {
    try {
        const newCrop = await Crop.create(req.body);

        res.status(201).json({
            success: true,
            message: "Crop added successfully",
            data: newCrop,
        });
    } catch (error) {
        next(error);
    }
};
