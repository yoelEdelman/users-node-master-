// Model User

// co mongoose
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userTmpSchema = new Schema({
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
        required: true
    },

    is_admin:{
        type: Boolean,
        required: true
    }

// _id: String d'office dans Mongo DB

}, { collection: 'users_confirm'})

///Function for password
userTmpSchema.methods.validPassword = function (password) {
    return this.password === password
}


const UserTmp = mongoose.model('users_confirm', userTmpSchema)
module.exports = UserTmp