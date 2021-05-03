const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { mongoose } = require('./db/mongoose')

const app = express();
app.use(cors());

// middlewares
app.use(bodyParser.json());

// Loading model for list and task
const { List, Task } = require('./db/models');

app.get('/', (req,res) => {
    res.send('hello, world!')
})

// to get all the lists 
app.get('/lists', (req,res) => {
    List.find({}).then((lists) => {
        res.send(lists);
    }).catch((err) => {
        res.send(err);
    });
});

// to create a list
app.post('/lists', (req,res) => {
    let title = req.body.title;
    let newList = new List({
        title
    });
    newList.save().then((listDoc) => {
        res.send(listDoc);
    })
});

// update a spefic list
app.patch('/lists/:id', (req,res) => {
    List.findOneAndUpdate({ _id: req.params.id}, {
        $set: req.body
    }).then(() => {
        res.sendStatus(200)
    })
})

// delete a list
app.delete('/lists/:id', (req, res) => {
    List.findOneAndRemove({
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc)
    })
});

// return all task to specific list
app.get('/lists/:listId/tasks', (req,res) => {
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks)
    })
})

// creating a task
app.post('/lists/:listId/tasks', (req,res) => {
    let newTask = new Task({
        title: req.body.title,
        _listId: req.params.listId
    })
    newTask.save().then((newTaskDoc) => {
        res.send(newTaskDoc);
    })
})

// get one task only
// app.get('/lists/:listId/tasks/:taskId', (req,res) => {
//     Task.findOne({
//         _id: req.params.taskId,
//         _listId: req.params.listId
//     }).then((task) => {
//         res.send(task)
//     })
// })

// updation of task
app.patch('/lists/:listId/tasks/:taskId', (req,res) => {
    Task.findOneAndUpdate({
        _id: req.params.taskId,
        _listId: req.params.listId
    }, {
        $set: req.body
    }).then(() => {
        res.send({message: 'Updated successfully.'})
    })
})

// delete a task
app.delete('/lists/:listId/tasks/:taskId', (req,res) => {
    Task.findOneAndDelete({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((removedTaskDoc) => {
        res.send(removedTaskDoc)
    })
})

app.listen(3000, () => {
    console.log("server is up and running!!!")
})