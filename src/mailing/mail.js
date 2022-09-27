const nodemailer = require('nodemailer')
const handlebars = require('handlebars');
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

async function sendMail({ to, subject, template, data }) {
	if (!template) return 'Fail to get template'
	let htmlToSend = await renderHTMLfromTemplateWithData(template, data);
	let mailOption = {
		from: `<${systemMail}>`,
		to: to, // "bar@example.com, baz@example.com"
		subject: subject, // "Hello ✔" Subject line
		html: htmlToSend, // html body
	}
	let info;
	try {
		info = await transporter.sendMail(mailOption);
	}
	catch (e) {
		console.log(e);
	}
	return info
}

module.exports = {
	sendMail,
}