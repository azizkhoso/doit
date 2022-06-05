const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const mongodb = require('mongodb');
const dotenv = require('dotenv');

// configuring env
dotenv.config();

// Setting up Mongodb Client
const client = new MongoClient(process.env.MONGODB_URL);
const Users = client.db('doit').collection('users'); // users collection
const Tasks = client.db('doit').collection('tasks'); // tasks collection

// Checking the mongodb connection with MongoClient.connect()
client.connect().then(() => console.log('connected to database successfully')).catch((e) => console.error(e));

const app = express(); // Initialized express app

app.use(express.json()); // parsing body as json data
app.use('/', express.static(path.join(__dirname, 'public'))); // serving static files from public folder

// HTML Pages route handlers
app.get('/', (req, res) => { // home page route
  const home = path.join(__dirname, 'public', 'index.html');
  res.sendFile(home); // send index.html on home route
});
app.get('/login-signup', (req, res) => { // login-signup route
  const loginSignup = path.join(__dirname, 'public', 'login-signup.html');
  res.sendFile(loginSignup); // send login-signup.html
});
app.get('/tasks', (req, res) => { // tasks route
  const tasks = path.join(__dirname, 'public', 'tasks.html');
  res.sendFile(tasks); // send tasks.html
});
app.get('/add-task', (req, res) => {// add taks page route
  const addTask = path.join(__dirname, 'public', 'add-task.html');
  res.sendFile(addTask); // send index.html on add-task route
});
app.get('/edit-task', (req, res) => {// edit taks page route
  const editTask = path.join(__dirname, 'public', 'edit-task.html');
  res.sendFile(editTask); // send index.html on edit-task route
});
app.get('/task-details', (req, res) => {// update taks page route
  const taskDetails = path.join(__dirname, 'public', 'task-details.html');
  res.sendFile(taskDetails); // send index.html on update-task route
});

// login handler
app.post('/login', async (req, res) => {
  try {
    const foundUser = await Users.findOne({ userName: req.body.userName });
    if(!foundUser) throw new Error('The user does not exist, please try again');
    if (!bcrypt.compareSync(req.body.password, foundUser.password)) throw new Error('Incorrect password, please try again');
    // sending the id of successfully logged in user
    res.json({ _id: foundUser._id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// signup handler
app.post('/signup', async (req, res) => {
  try {
    const foundUser = await Users.findOne({ userName: req.body.userName });
    if(foundUser) throw new Error('This user already exists');

    const salt = bcrypt.genSaltSync(5); // generating salt with 5 rounds
    const hash = bcrypt.hashSync(req.body.password, salt); // generating hashed password
    
    const data = await Users.insertOne({ userName: req.body.userName, password: hash });
    // user is auto logged in after signup; sending the id of the new user
    res.json({ _id: data.insertedId });
    res.json({ token: token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
// login verification using _id of user
// _id of user is sent in Authorization header
async function verifyLogin(req, res, next) { // this is an express middleware function
  try {
    const _id = req.headers.authorization;
    let data = await Users.findOne({ _id: mongodb.ObjectId(_id) }); // find the user with id given in authorization
    if (!data) { // if user is not found
      throw new Error('Not logged in, user not found');
    }
    req.userData = data; // send userData key in request; it contains all the user details and userName
    next(); // go to next route; e.g. after login verifcation goto tasks router
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// tasks router
const tasksRouter = express.Router();
tasksRouter.get('/', async (req, res) => {
  try {
    const uid = req.userData.uid;
    const allTasks = await Tasks.find({ uid: uid }).toArray(); // getting all tasks whose user id is supplied
    res.json({ tasks: allTasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
tasksRouter.post('/add', async (req, res) => {
  try {
    const task = req.body;
    const data = await Tasks.insertOne({ ...task, uid: req.userData.uid }); // along with all properties of a task, save the user id in database
    res.json({ data: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
tasksRouter.put('/edit/:_id', async (req, res) => {
  try {
    const task = req.body;
    const data = await Tasks.findOneAndReplace({ _id: mongodb.ObjectId(req.params._id) }, { ...req.body, uid: req.userData.uid });
    res.json({ data: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
tasksRouter.delete('/:_id', async (req, res) => { // :_id is request parameter
  try {
    const _id = req.params._id
    const foundTask = await Tasks.findOneAndDelete({ _id: mongodb.ObjectId(_id) });
    res.json({ data: foundTask });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// using express middleware
app.use(
  '/user-tasks',
  verifyLogin, // before loading tasks, verify the user login
  tasksRouter, // all routes starting with /user-tasks will be handled by tasks router
);


app.listen(3000, () => console.log('listening on port 3000'));