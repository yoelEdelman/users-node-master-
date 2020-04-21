const express = require('express')
const app = express()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const urlencodeParser = bodyParser.urlencoded({ extend: false })

const passport = require('passport')
const session = require('express-session')
const localStrategy = require('passport-local').Strategy

const nodemailer = require("nodemailer");

require('dotenv').config()
const { APP_DOMAIN, APP_PORT, DB_USER, DB_PASSWORD, MAIL, MAIL_PASSWORD } = process.env

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MAIL,
        pass: MAIL_PASSWORD
    }
});

function generate_token(length){
    let a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    let b = [];
    for (let i=0; i<length; i++) {
        let j = (Math.random() * (a.length-1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}



const User = require('./models/User')

const UserConfirm = require('./models/UserTmp')

const mongoose = require('mongoose')
mongoose.set('useFindAndModify', false)
mongoose.connect(`mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0-qj03t.mongodb.net/test?retryWrites=true&w=majority`, {useNewUrlParser: true, useUnifiedTopology: true})
const db = mongoose.connection
db.on('error', console.error.bind(console, 'error : cant connect'))
db.once('open', () => console.log('Connected to mongo'))

app.use(helmet())
app.set('views', './views')
app.set('view engine', 'pug')
app.use(express.static('assets'))

app.use(session({
    secret: 'chinois',
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
    done(null, user)
})

passport.deserializeUser((user, done) =>{
    done(null, user)
})
passport.use(new localStrategy({
        /// Spécifié si le champ ne se nomme pas username
       usernameField: 'name'

    },
    (name, password, done) =>{
        UserConfirm.findOne({name: name}, (err, user) => {
            if(err){
                return done (err)
            }

            if(!user){
                return done(null, false, {
                    message: "User not found"
                })
            }

            if (!user.validPassword(password)){
                return done(null, false, {
                    message: 'Password is wrong'
                })
            }

            return done(null, user)
        })
    }
))


app.post('/signup', urlencodeParser, async (req, res) => {
    const { name, password, email } = req.body

    try{
        const existingUser = await UserConfirm.findOne({name})
        if(existingUser){
            return res.status(500).send(`L'utilisateur ${existingUser.name} est déjà inscrit`)
        }
    }catch (error) {
        return res.status(500).send("Une erreur est survenue")
    }

    try{
        let token =  generate_token(20)
        const newUser = new User({name, password, email, token})
        const savedUser = await newUser.save()

        const mailOptions = {
            from: MAIL, // sender address
            to: newUser.email, // list of receivers
            subject: 'Welcome', // Subject line
            html: '<p>You are now register on my app</p> <a href="http://localhost:3000/confirm/'+newUser.token+'">Click here to confirm</a>'
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if(err)
                console.log(err)
            else
                console.log(info);
        });

        return res.status(201).send(`Check your mail to confirm your inscription`)

    }catch (error) {
        return res.status(500).send("Une erreur est survenue")

    }
})


app.post('/signin', urlencodeParser, passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/signin'
}))

///routes

app.get('/', (req, res) =>{
    res.render('home.pug')
})

app.get('/signin', (req, res) =>{
    res.render('signin.pug')
})

app.get('/signup', (req, res) =>{
    res.render('signup.pug')
})



app.get('/logout', (req, res) =>{
    if (req.session){
        console.log(req.session)
        req.session.destroy()
        res.render('signin.pug')
    }
})


app.get('/confirm/:token', urlencodeParser, async (req, res) =>{
    const { token } = req.params

    console.log(token)

    try{
        const existingUser = await User.findOne({token})
        if(existingUser){
            let isAdmin
            if (existingUser.name === 'admin' && existingUser.password === 'admin'){
                isAdmin = true
            }else{
                isAdmin= false
            }
            const userConfirm = new UserConfirm({
                name: existingUser.name,
                password: existingUser.password,
                email: existingUser.email,
                token: token,
                is_admin: isAdmin
            })

            console.log(existingUser._id)
            await userConfirm.save()
            const userDeleted = await User.findOneAndDelete({ "_id": existingUser._id})

            res.render('signin.pug', { message: 'Your are confirmed, please Signin'})
           // return res.status(201).send(`User confirm`)
        }

    }catch (error) {
        console.log(error)
        return res.status(500).send("Une erreur est survenue")
    }

})


// app.get('*', (req, res) =>{
//     res.render('404.pug')
// })

// End routes




app.get('/user', async (req, res) => {

    console.log(req.user)

    if (!req.user) return res.redirect('/signin')

    try {
        const users = await UserConfirm.find({}).select('_id name email is_admin')
      //  return res.send(users)
        res.render('users.pug',{users: users, userCo: req.user, formAction: '/user/'+req.user._id})
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})

app.put('/user/:_id', urlencodeParser,(req, res) => {
    const {_id} = req.params
    const {name, password } = req.body
    User.findByIdAndUpdate(_id, { $set : {name, password}} , { new: true }, (error, data) => {
        if(error)
            return res.status(500).send('Erreur survenue')
        if(!data)
            return res.status(404).send(`Il n'y a pas d'user ${_id}`)
        const userUpdate = { _id : data._id, name: data.name }
        return res.send(`Utilisateur ${data._id} modifié : ${userUpdate}`)

    })
})

app.get('/user/:_id', async (req, res) => {

    if (!req.user) return res.redirect('/signin')


    const {_id} = req.params

    console.log(_id)

    try{
        const user = await  UserConfirm.findById(_id).select('_id name email is_admin')

        console.log(user)
        res.render('user.pug',{user: user})
       // res.send(user)
    } catch (error) {
        res.status(500).send("Erreur du serveur")
    }
})


//app.delete
app.post('/user/:_id', async (req, res) => {

    if (!req.user || !req.user.is_admin) return res.redirect('/signin')

    const {_id} = req.params //on recupere l'id qui est dans req.params
    try{
        const userDeleted = await UserConfirm.findOneAndDelete(_id)
        if (!userDeleted) return res.status(404).send(`Il n'existe pas d'utilisateur ${_id}`)
            res.send(`user ${userDeleted._id} supprimé`)

    } catch (err) {
        res.status(500).send('Erreur du serveur')
    }
})


//app.use(bodyParser.urlencoded({ extended: true}))
app.listen(APP_PORT, () => console.log('lancé sur le port 3000'))