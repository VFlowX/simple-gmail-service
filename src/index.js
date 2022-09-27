const bodyParser = require("body-parser");
const https = require('https');
const express = require("express");
https.globalAgent.options.rejectUnauthorized = false;
const database = require("./config/database");
const cron = require("node-cron");
const app = express();
const mailService = require("./mailing/mail");
const IndexService = require("./index/index");

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

database.connect().then((connected) => {
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
    err ? console.log("Error happened", err) : console.log("Server is up!")
  );

  app.get('/', async function (req, res) {
    console.log('pong');
    res.status(200).json({
      msg: 'dieuhanh-service up'
    })
  });
  app.post('/sendMail', async function (req, res) {
    let body = req.body;
    if (body && body.to && body.subject && body.templateName && body.data) {
      let msg = await mailService.sendMail(client, {
        to: body.to,
        subject: body.subject,
        templateName: body.templateName,
        data: body.data
      })
      res.status(200).json({
        msg: msg
      })
    }
    else {
      res.status(400).json({
        msg: 'to, subject, templateName, data in Body is required'
      })
    }

  });

  app.post('/sinhMa', async function (req, res) {
    let body = req.body;
    if (body && body.db && body.pattern && body.pad) {
      const counterDB = client.db(body.db).collection('vuejx_counter');
      let patternShortName = body.collection + '___' + body.pattern;
      if (body.pattern.indexOf('{}') === -1) {
        res.status(200).json({
          generated: body.pattern
        })
      }
      else {
        let curNum;
        await counterDB.findOne({
          'shortName': patternShortName
        }, async (err, docs) => {
          if (!docs) {
            if (body.preview) {
              curNum = 1;
              let generatedCode = body.pattern.replace(/{}/, pad(curNum, +body.pad))
              res.status(200).json({
                generated: generatedCode
              })
            }
            else {
              await counterDB.insertOne({ shortName: patternShortName, counter: 1 }, (err, created) => {
                curNum = 1;
                let generatedCode = body.pattern.replace(/{}/, pad(curNum, +body.pad))
                res.status(200).json({
                  generated: generatedCode
                })
                counterDB.updateOne({ 'shortName': patternShortName }, { $set: { counter: curNum + 1 } });
              })
            }
          }
          else {
            curNum = docs.counter;
            let generatedCode = body.pattern.replace(/{}/, pad(curNum, +body.pad))
            res.status(200).json({
              generated: generatedCode
            })
            if (!body.preview) {
              counterDB.updateOne({ 'shortName': patternShortName }, { $set: { counter: curNum + 1 } });
            }
          }
        })
      }
    }
    else {
      res.status(400).json({
        msg: 'Missing params'
      })
    }
  });

  cron.schedule('* * * * *', async () => {
    mailService.autoSendT_EmailToSend(client).then(res => {
      res && console.log(res)
    })
    mailService.autoSendMailCSDL_BAOCAO(client).then(res => {
      res && console.log(res)
    })
  })

  app.post('/reIndex', async function (req, res) {
    let body = req.body;
    if (body.token == process.env.ADMIN_TOKEN) {
      if (body.db && body.collection) {
        IndexService.reindex(client, body.db, body.collection)
        res.status(200).json("Indexing. Pls wait ...");
      }
      else {
        res.status(200).json("Params required: db, collection");
      }
    }
    else {
      res.status(409).json("Unauthorized");
    }

  });



}).catch((err) => {
  console.log(err)
});