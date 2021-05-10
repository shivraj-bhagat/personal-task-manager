const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect( process.env.DATABASE , { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Connect to mongodb successfully!!!');
}).catch((err) => {
    console.log("Error While attempting to connect to mongodb");
    console.log(err.message);
});

mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

module.exports = {
    mongoose
};