const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { mongoose } = require('./db/mongoose')
const jwt = require('jsonwebtoken');

const app = express();

// middlewares
let corsOption = {
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204,
    "exposedHeaders": 'x-access-token, x-refresh-token'
}

app.use(cors(corsOption))
app.use(bodyParser.json());

// authentication for valid jwt token
let authenticate = (req,res,next) => {
    let token = req.header('x-access-token');

    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if(err) {
            // JWT invalid
            res.status(401).send(err);
        } else {
            // valid jwt
            req.user_id = decoded._id
            next();
        }
    });
} 

// verify refresh token middlewares
let verifySession = (req, res, next) => {
    let refreshToken = req.header('x-refresh-token');
    let _id = req.header('_id');
    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if(!user) {
            return Promise.reject({
                "error": "User not found. Make sure that the refresh token and user id are correct"
            })
        }

        // user is found .so, session is valid
        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;
        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if(session.token === refreshToken) {
                // check if session has expired
                if(User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // not expired
                    isSessionValid = true;
                }
            }
        })

        if(isSessionValid) {
            next()
        } else {
            return Promise.reject({
                "error": "Refresh token has expired or session is invalid"
            })
        }
    }).catch((err) => {
        res.status(401).send(err)
    })
}


// Loading model for list and task
const { List, Task, User } = require('./db/models');

app.get('/', (req,res) => {
    res.send('hello, world!')
})

// to get all the lists 
app.get('/lists', authenticate , (req,res) => {
    List.find({
        _userId: req.user_id
    }).then((lists) => {
        res.send(lists);
    }).catch((err) => {
        res.send(err);
    });
});

// to create a list which belong to particular user authenticated user
app.post('/lists', authenticate, (req,res) => {
    let title = req.body.title;
    let newList = new List({
        title,
        _userId: req.user_id
    });
    newList.save().then((listDoc) => {
        res.send(listDoc);
    })
});

// update a spefic list
app.patch('/lists/:id', authenticate, (req,res) => {
    List.findOneAndUpdate({ _id: req.params.id, _userId: req.user_id}, {
        $set: req.body
    }).then(() => {
        res.send({'message': 'updated successfully!!'})
    })
})

// delete a list
app.delete('/lists/:id', authenticate, (req, res) => {
    List.findOneAndRemove({
        _id: req.params.id,
        _userId: req.user_id
    }).then((removedListDoc) => {
        res.send(removedListDoc);
        // delete all task that are in the list
        deleteTasksFromList(removedListDoc._id);
    })
});

// return all task to specific list
app.get('/lists/:listId/tasks', authenticate, (req, res) => {
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    })
});

// creating a task
app.post('/lists/:listId/tasks', authenticate, (req,res) => {

    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            // list object with the specified conditions was found
            // therefore the currently authenticated user can create new tasks
            return true;
        }

        return false;
    }).then((canCreateTask) => {
        if (canCreateTask) {
            let newTask = new Task({
                title: req.body.title,
                _listId: req.params.listId
            });
            newTask.save().then((newTaskDoc) => {
                res.send(newTaskDoc);
            })
        } else {
            res.sendStatus(404);
        }
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
app.patch('/lists/:listId/tasks/:taskId', authenticate, (req,res) => {

    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            return true;
        }

        return false;
    }).then((canCreateTask) => {
        if (canCreateTask) {
            Task.findOneAndUpdate({
                _id: req.params.taskId,
                _listId: req.params.listId
            }, {
                $set: req.body
            }).then(() => {
                res.send({'message': 'Updated successfully.'})
            })
        } else {
            res.sendStatus(404);
        }
    })
})

// delete a task
app.delete('/lists/:listId/tasks/:taskId', authenticate ,(req,res) => {
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            return true;
        }

        return false;
    }).then((canCreateTask) => {
        if (canCreateTask) {
            Task.findOneAndDelete({
                _id: req.params.taskId,
                _listId: req.params.listId
            }).then((removedTaskDoc) => {
                res.send(removedTaskDoc)
            })
        } else {
            res.sendStatus(404);
        }
    })
})

// user routes

// signup post request
app.post('/users', (req,res) => {
    let body = req.body;
    let newUser = new User(body);
    
    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        return newUser.generateAccessAuthToken().then((accessToken) => {
            return {accessToken, refreshToken}
        });
    }).then((authTokens) => {
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((err) => {
        res.status(400).send(err);
    })
})

// login post request
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            return user.generateAccessAuthToken().then((accessToken) => {               // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
       // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})

// generate access token
app.get('/users/me/access-token', verifySession, (req, res) => {
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})

// helper methods
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log("done" + _listId)
    })
}

app.listen(3000, () => {
    console.log("server is up and running!!!")
})