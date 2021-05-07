const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    _userId: {
        type: mongoose.Types.ObjectId,
        required: true
    }
})

const List = mongoose.model('List', listSchema);

module.exports = { List };