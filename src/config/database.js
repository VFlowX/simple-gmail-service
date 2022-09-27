const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;

const uri = process.env.MONGO_SERVICE_HOST;

let _client = null;
let bucket = null;
let bucket_page = null;

mongoose.connection.on("open", async function () {
  console.log("open mongodb core!");
  _client = mongoose.connection.client;
  bucket = Grid(mongoose.connection.client.db("oauth2"));
});

mongoose.connection.on("error", function (err) {
  console.log("Could not connect to mongodb core!", err);
  mongoose.disconnect();
});

mongoose.connection.on("disconnected", function () {
  console.log("disconnected to mongodb core!");
  mongoose.connect(uri, {
    server: { auto_reconnect: true },
    useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS: 360000
  });
});

mongoose.connection.on("connected", function () {
  console.log("mongodb core connected!");
});


const connect = () => {
  return new Promise((resolve, reject) => {
    mongoose.connect(uri, {
      // server: { auto_reconnect: true },
      useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS: 360000
    }).then(() => {
      resolve({
        gfs: bucket,
        _client: _client
      });
    }).catch((err) => {
      console.log('connect', err)
      reject(null)
    });
  })
}

module.exports = {
  connect
}