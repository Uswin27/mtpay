
const { engine }=require('express-handlebars');
const { log } = require('handlebars');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
app.engine('hbs',engine({extname:'hbs',defaultLayout:false}));
app.set('view engine','hbs')

let userSchema=new mongoose.Schema({
    name:String,
    password:String,
    email:String,
    accno:String,
    accpin:String,
    balance:Number,
    nooftrans:Number,
    transfer:[String]
})
const userModel=mongoose.model('user',userSchema)

// Set up session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Use body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect("mongodb+srv://usramu27:mtpay@mtpay.kel0mm9.mongodb.net/data?retryWrites=true&w=majority")
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Error connecting to MongoDB:", err));

// Render signin page
app.get('/signin', (req, res) => {
    res.render('signin');
});

// Handle signin POST request
app.post('/postsignin', async (req, res) => {
    const { name, password, email, accno, accpin } = req.body;
    try {
        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            console.log("User already exists");
            return res.render("helper",{error:"User already exists"});
        }
        // Create new user
        await userModel.create({
            name, password, email, accno, accpin, balance: 5000, nooftrans: 0
        });
        console.log("User created successfully");
        res.render("home", { name });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).render("helper",{
            error:"Enter valid Values Because Given values already available"
        });
    }
});

// Render login page
app.get('/', (req, res) => {
    res.render('login');
});
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login POST request
app.post('/postlogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email, password });
        if (!user) {
            console.log("Invalid credentials");
            return res.render("helper",{error:"Invalid credentials"});
        }
        req.session.user = user;
        res.render("home", { name: user.name });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).render("helper",{
            error:"Enter valid Values "
        });
    }
});

// Render home page
app.get('/home', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        res.render('home', { name: req.session.user.name });
    }
});
app.get('/userdetails',(req,res)=>{
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        res.render('userdetails', { 
            name: req.session.user.name,
            password: req.session.user.password,
            email: req.session.user.email,
            accno: req.session.user.accno,
            accpin: req.session.user.accpin,
         });
    }
})
app.get('/balance',async(req,res)=>{
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        let  data=await userModel.find({name:`${req.session.user.name}`})
        res.render("balance",{
            balance:data[0].balance
        })
    }
})

app.get('/transfer',(req,res)=>{
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        res.render('transfer',{
        })
    }
})
app.post('/posttransfer',async(req,res)=>{
    if (!req.session.user) {
        res.redirect('/login');
    }
     else {
    let datagiven={
        amt:Number.parseInt(req.body.amt),
        reaccno:req.body.reaccno,
        pin:req.body.pin
    }
    //checking entered correct pin or notalance)
    if(req.session.user.accno!=datagiven.reaccno&&req.session.user.accpin==datagiven.pin && datagiven.amt<=req.session.user.balance)
    {
        let  data=await userModel.find({accno:datagiven.reaccno})
        //data is the data of other user
        if(data.length!=0)
        {
            //chenging value in receiver
            await userModel.findOneAndUpdate({name:data[0].name},{balance: datagiven.amt+data[0].balance})
            //chenging value in sender
            //changing values in currentloger because data currently stored in currentloger
            //subracting because currentloger is sender
            await userModel.findOneAndUpdate({name:req.session.user.name},{balance:  req.session.user.balance - datagiven.amt})
            //Adding transaction values
               //sender transaction Acticities   
            await userModel.findOneAndUpdate({name:req.session.user.name},{nooftrans:req.session.user.nooftrans+1}).then((e)=>{
                e.transfer.push(`${datagiven.amt} amount transfered from you to ${data[0].name}`)
                return e.save();
            })

            await userModel.findOneAndUpdate({name:data[0].name},{nooftrans:data[0].nooftrans + 1}).then((e)=>{
                e.transfer.push(`${datagiven.amt} amount received from ${req.session.user.name}`)
                return e.save();
            })
            res.render('home',{name:req.session.user.name})
         }
        else
        {
            res.render("helper",{
                error:"Enter correct reaccono"
            })
        }
    }
    else
    {
        res.render("helper",{
            error:"Enter correct Values"
        })
    }
     }
})
app.get('/transaction',async(req,res)=>{
    if (!req.session.user) {
        res.redirect('/login');
    }
    else 
    {
        let  data=await userModel.find({name:`${req.session.user.name}`})
        res.render('transaction',{
            nooftrans:data[0].nooftrans,
            transfer:data[0].transfer
        })
    }
})

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});
app.get('/bank',(req,res)=>{
    
    if (!req.session.user) {
        res.redirect('/login');
    }
     else {
        res.render("atm")
     }
})
app.post('/submit',async(req,res)=>{
    if (!req.session.user) {
        res.redirect('/login');
    }
     else {
    datagiven={
        accno:req.body.accno,
        acpin:req.body.pin,
        amt:Number.parseInt(req.body.amt)
    }
    
        let  data=await userModel.find({accno:datagiven.accno})
        if(data.length!=0){
        await  userModel.findOneAndUpdate({name:data[0].name},{balance: datagiven.amt + data[0].balance})
        res.render('helper',{
            error:"thank u for using Mtpay"
        })
    }
    else res.render('helper',{
        error:"Enter correct details to continue"
    })
}
})

// Set up server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
