const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
// Bcrypt is a Node.js library that uses a cryptographic algorithm to securely hash passwords
const jwt = require('jsonwebtoken');

// Database connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '9936',
    database: 'sys'
});

// middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// routes
// 1. Register a user
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], (err, result) => {
        if (err) {
            res.status(500).send({ message: 'Error registering user' });
        } 
        else {
            res.send({ message: 'User registered successfully' });
        }
    });
});


// 2. Login user
app.post('/login',(req, res) => {
    const {email, password} = req.body;
    db.query('SELECT * FROM users WHERE email = ?',[email], (err, result) => {
        if(err || result.length === 0) {
            res.status(401).send({message: 'Invalid email or password'});
        }
        else {
            const user = result[0];
            const isValidPassword = bcrypt.compareSync(password, user.password);
            if(!isValidPassword) {
                res.status(401).send({message:'Invalid email or password'});
            }
            else {
                const token = jwt.sign({userId: user.id}, 'secret-key', {expiresIn:'1h'});
                res.send({token});
            }
        }
    });
});


// 3. Add a new train
app.post('/trains',(req, res)=> {
    const {name,source,destination,total_seats} = req.body;
    db.query('INSERT INTO trains(name,source,destination,total_seats,available_seats) VALUES(?,?,?,?,?)',[name,source,destination,total_seats,total_seats], (err, result) => {
        if(err) {
            res.status(500).send({message: 'Error adding train'});
        }
        else {
            res.send({message: 'Train added successfully'});
        }
    });
});


// 4. get seat availability
app.get('/trains',(req, res) => {
    const {source, destination} = req.query;
    db.query('SELECT * FROM trains WHERE source = ? AND destination = ?', [source, destination],(err, result) => {
        if(err) {
            res.status(500).send({message:'Error fetching trains'});
        }
        else {
            req.send({trains: result});
        }
    });
});

// 5. book a seat
app.post('/bookings', (req, res) => {
    const{train_id} = req.body;
    db.query('SELECT available_seats FROM trains WHERE id=?',[train_id], (err, result)=>{
        if(err || result[0].available_seats===0) {
            res.status(400).send({message: 'No seats available'});
        }
        else {
            db.query('UPDATE trains SET available_seats = available_seats-1 WHERE id =?',[train_id],(err, result)=>{
                if(err) {
                    res.status(500).send({message: 'Error booking seat'});
                }
                else {
                    db.query('INSERT INTO bookings(user_id, train_id) VALUES(?,?)',[req.user.id, train_id],(err,result)=> {
                        if(err) {
                            res.status(500).send({message: 'Error booking seat'});
                        }
                        else {
                            res.send({message: 'seat booked successfully'});
                        }
                    });
                }
            });
        }
    });
});


// 6. get specific booking details
app.get('/bookings/:booking_id',(req, res)=>{
    const {booking_id} = req.params;
    db.query('SELECT * FROM bookings WHERE id = ?',[booking_id],(err,result)=>{
        if(err || result.length===0) {
            res.status(404).send({message:'booking not found'});
        }
        else {
            res.send({booking: result[0]});
        }
    });
})

// Start server
const port = 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
console.log("Hello")