const nodemailer = require('nodemailer')
const handlebars = require('handlebars');
const databaseName = process.env.DATABASE_NAME;
const mailTemplateCollection = process.env.MAIL_TEMPLATE_COLLECTION;
const systemMail = process.env.SYSTEM_MAIL;
const systemMailPass = process.env.SYSTEM_MAIL_PASS;

const ObjectId = require('mongodb').ObjectId;

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: systemMail,
		pass: systemMailPass
	}
});

async function renderHTMLfromTemplateWithData(source, data) {
	const template = await handlebars.compile(source);
	return await template(data);
}

async function getTemplate(client,templateName, db) {
	let templateRecord = await client.db(db || databaseName).collection(mailTemplateCollection).findOne({
		MaMuc: templateName
	})
	return templateRecord && templateRecord.templateData;
}

async function sendMail(client, {to,subject,templateName,data }, db) {
	let template = await getTemplate(client, templateName, db);
	if (!template) return 'Fail to get template'
	let htmlToSend = await renderHTMLfromTemplateWithData(template, data);
	let mailOption = {
		from: `"Trung tâm TTDLMT" <${systemMail}>`,
		to: to, // "bar@example.com, baz@example.com"
		subject: subject, // "Hello ✔" Subject line
		html: htmlToSend, // html body
	}
	let info;
	try {
		info = await transporter.sendMail(mailOption);
	}
	catch (e){
		console.log(e);
	}
	return info
}

async function autoSendT_EmailToSend(client) {
	let myCursor = await client.db(databaseName).collection('T_EmailToSend').find({"isSent" : false});
	let count = 0;
	let fail = 0;
	while (await myCursor.hasNext()) {
		let mail = await myCursor.next()
		if (mail.mailTo.indexOf('@') > -1) {
	    let sentStatus = await sendMail(client, {
				to: mail.mailTo, //single mail !!! multiple => fix check success
				subject: mail.mailSubject,
				templateName: mail.mailTemplate._source.MaMuc,
				data: mail.mailTemplateData,
			})
			if (sentStatus?.accepted && sentStatus?.accepted.indexOf(mail.mailTo) > -1 ) {
				// mail success
				await client.db(databaseName).collection('T_EmailToSend').updateOne({
					_id: mail._id
				}, {
					$set: {
						isSent: true
					}
				});
				count++;
			}
			else {
				await client.db(databaseName).collection('T_EmailToSend').updateOne({
					_id: mail._id
				}, {
					$set: {
						isFail: true
					}
				});
				fail++;
			}
		}
    
	}
	return (count > 0 || fail > 0) ? {
		success: `Successfully Sent ${count} mail(s)`,
		fail: `Fail to send ${fail} mail(s)`
	}: ''
}

async function autoSendMailCSDL_BAOCAO(client) {
	let myCursor = await client.db('CSDL_BAOCAODOANHNGHIEP').collection('T_EmailToSend').find({"isSent" : false});
	let count = 0;
	let fail = 0;
	while (await myCursor.hasNext()) {
		let mail = await myCursor.next()
		if (mail.mailTo.indexOf('@') > -1) {
	    let sentStatus = await sendMail(client, {
				to: mail.mailTo, //single mail !!! multiple => fix check success
				subject: mail.mailSubject,
				templateName: mail.mailTemplate._source.MaMuc,
				data: mail.mailTemplateData,
			}, 'CSDL_BAOCAODOANHNGHIEP'
			)
			if (sentStatus?.accepted && sentStatus?.accepted.indexOf(mail.mailTo) > -1 ) {
				// mail success
				await client.db('CSDL_BAOCAODOANHNGHIEP').collection('T_EmailToSend').updateOne({
					_id: mail._id
				}, {
					$set: {
						isSent: true
					}
				});
				count++;
			}
			else {
				await client.db('CSDL_BAOCAODOANHNGHIEP').collection('T_EmailToSend').updateOne({
					_id: mail._id
				}, {
					$set: {
						isFail: true
					}
				});
				fail++;
			}
		}
    
	}
	return (count > 0 || fail > 0) ? {
		success: `Successfully Sent ${count} mail(s)`,
		fail: `Fail to send ${fail} mail(s)`
	}: ''
}

//debug
/*async function createTemplate(client) {
	let now = new Date().getTime();
	let inserted = await client.db(databaseName).collection(mailTemplateCollection).insertOne({
		createdAt: now,
		modifiedAt: now,
		type: mailTemplateCollection,
		username: 'admin',
		openAccess: 2,
		order: 0,
		site: 'csdl_mt',
		storage: 'regular',
		MaMuc: 'test',
		TenMuc: 'Test mail html template',
		templateData: '<h1>{{testData}}</h1>',
	})
}
async function createEmailToSend(client) {
	let now = new Date().getTime();
	let inserted = await client.db(databaseName).collection('T_EmailToSend').insertOne({
		createdAt: now,
		modifiedAt: now,
		type: 'T_EmailToSend',
		username: 'admin',
		openAccess: 2,
		order: 0,
		site: 'csdl_mt',
		storage: 'regular',
		mailTo: 'hieunt.fds@gmail.com',
		mailSubject: 'Hello form FDS',
		mailTemplateData: {
			HoVaTen: 'Template test',
		},
		mailTemplate: {
			_source: {
				MaMuc: 'test',
				TenMuc: 'Test mail html template',
			}
		},
		isSent: false,
	})
}*/
module.exports = {
	sendMail,
	autoSendT_EmailToSend,
	autoSendMailCSDL_BAOCAO,
	// createEmailToSend,
	// createTemplate,
}