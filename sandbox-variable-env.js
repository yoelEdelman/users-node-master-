//console.log(process
//console.log(process.env)
//console.log(process.argv)

const { NODE_ENV } = process.env

if (NODE_ENV  === 'production'){
    console.log('App in Production mode')
}

if (NODE_ENV  === 'dev'){
    console.log('App in Dev mode')
}

console.log('Mode :' , NODE_ENV)