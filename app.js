var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
appId: process.env.MICROSOFT_APP_ID,
appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var Dialogs = require('./Dialog');

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector,[

function (session) {
    session.send("Welcome to the dinner reservation.");
    builder.Prompts.text(session, "May I Know your Name ?");
}
,
function (session,results) {
    // session.dialogData.userName = results.response;
    session.send("Welcome %s !",results.response );
    builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
},
function (session, results) {
    session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
    builder.Prompts.text(session, "How many people are in your party?");
},
function (session, results) {
    session.dialogData.partySize = results.response;
    builder.Prompts.text(session, "Who's name will this reservation be under?");
},
function (session, results) {
    session.dialogData.reservationName = results.response;

    // Process request and display reservation details
    session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize} <br/>Reservation name: ${session.dialogData.reservationName}`);
    session.endDialog();
    
}
]);

