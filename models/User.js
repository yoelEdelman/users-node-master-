// Model User

// co mongoose
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    name : {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    token: {
        type: String,
        expires: '2m',
        required: true
    }

    // _id: String d'office dans Mongo DB

}, { collection: 'users'})

///Function for password
userSchema.methods.validPassword = function (password) {
    return this.password === password
}

const User = mongoose.model('User', userSchema)
module.exports = User