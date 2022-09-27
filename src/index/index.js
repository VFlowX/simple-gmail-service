const axios = require('axios');
const jsonMapper = require("json-mapper-json");
const BATCH = 10;
async function reindex(client, db, collection) {
  let startTime = new Date().getTime();
  let minMem = 9999999, maxMem = 0;
  await clearIndex(db, collection);

  let bulkDocument = [], index = 0;
  var total = 0;
  let colConfig = await getConfig(client, db, collection);
  let cursor = client.db(db).collection(collection).find();   // however you call, lean with mongoose
  while (await cursor.hasNext()) {
    let doc = await cursor.next();
    total = total + 1;
    if (colConfig) {
      doc = await ext_es(doc, colConfig["ext_es"]);
    }
    doc.id = doc._id.toString();
    bulkDocument.push(doc);
    if (bulkDocument.length > BATCH) {
      let status = await sendToEs(
        db,
        collection,
        bulkDocument,
        "bulkDocument",
      );
      bulkDocument = [];
      let usedMem = process.memoryUsage().heapUsed / 1024;
      if (usedMem < minMem) {
        minMem = usedMem;
      }
      if (usedMem > maxMem) {
        maxMem = usedMem;
      }
      await sleep(1000)
      console.log(`${total}, Mem used ${Math.round(usedMem * 100) / 100} KB`);
    }
  }
  if (bulkDocument.length > 0) {
    await sendToEs(
      db,
      collection,
      bulkDocument,
      "bulkDocument",
    );
  }
  let usedMem = process.memoryUsage().heapUsed / 1024;
  console.log(`${total}, Mem used ${Math.round(usedMem * 100) / 100} KB`);
  let endTime = new Date().getTime()
  console.log("Time:", endTime - startTime, 'ms')
  console.log(`Mem: min: ${minMem} KB, max: ${maxMem} KB`)
  return (`TOTAL ES: ${db} ${collection} ${total}`)
};
async function clearIndex(db, collection) {
  const config = {
    method: "post",
    url: "http://vuejx-core:3000/reNewDocument",
    timeout: 30000000,
    maxContentLength: 524288900,
    maxBodyLength: 524288900,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      db: db,
      collection: collection,
    }),
  };
  await axios(config)
    .then(function (response) {
      console.log("DONE CLEAR INDEX: ", db, collection);
    })
    .catch(function (error) {
      console.log("error", error);
    });
};

async function sendToEs(db, collection, body, api) {
  const config = {
    method: "post",
    url: process.env.COREURL + api,
    timeout: 30000000,
    maxContentLength: 524288900,
    maxBodyLength: 524288900,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      body: body,
      db: db,
      collection: collection,
    }),
  };
  await axios(config)
    .then(function (response) {
      console.log("DONE: ", db, collection, body.length);
    })
    .catch(function (error) {
      console.log("error", error);
    });
};
async function getConfig(client, db, collection) {
  return await client.db("vuejx_cfg").collection(
    "vuejx_collection",
  ).findOne({
    shortName: collection,
    storeDb: db,
  }, {
    projection: {
      ext_es: 1,
    },
  });
}
async function ext_es(doc, ext) {
  return new Promise((resolv, reject) => {
    if (ext) {
      let item = doc;
      ext = eval(
        "( " + ext + " )",
      );
      jsonMapper({
        item,
      }, ext).then((result) => {
        doc = { ...doc, ...result };
        delete doc["_cleanData"];
        resolv(doc);
      });
    } else {
      resolv(doc);
    }
  });
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  reindex
}