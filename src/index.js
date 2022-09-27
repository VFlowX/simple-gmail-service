const bodyParser = require("body-parser");
const https = require('https');
const express = require("express");
https.globalAgent.options.rejectUnauthorized = false;
const app = express();
const mailService = require("./mailing/mail");

const client = connected._client;
app.use(bodyParser.json({
  limit: "50mb"
}));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err,
  });
});

app.listen(3000, (err) =>
  err ? console.log("Error happened", err) : console.log("Mailing service is up and running")
);

app.get('/', async function (req, res) {
  console.log('pong');
  res.status(200).json({
    msg: 'Mailing service is up and running'
  })
});
app.post('/sendMail', async function (req, res) {
  let body = req.body;
  if (body && body.to && body.subject && body.templateHTML && body.data) {
    let msg = await mailService.sendMail(client, {
      to: body.to,
      subject: body.subject,
      template: body.templateHTML,
      data: body.data
    })
    res.status(200).json({
      msg: msg
    })
  }
  else {
    res.status(400).json({
      msg: 'to, subject, templateHTML, data in Body is required'
    })
  }
});