var request = require('request');
module.exports = function(session,args,next){
    session.sendTyping();
    
    var askedQuestion = session.message.text;
    var answerQuestion = JSON.stringify({question:askedQuestion});

    const URLpart1 = "https://westus.api.cognitive.microsoft.com/qnamaker/v1.0/knowledgebases/";
    var KnowledgeBaseID = process.env.KBID;
    const URLpart2 = "/generateAnswer";
    
    var dialogURL = URLpart1 + KnowledgeBaseID + URLpart2;
    console.log(dialogURL);


    request.post(dialogURL,{body:answerQuestion} , function(err,code,body){
        if(err){
            console.log(err);
            session.endConversation("Sorry Something Went wrong");
        }
        else {
            var response = JSON.parse(body);
            console.log(response);
            if(response.score > 50){
                session.endConversation(response.answer);
            }
            else if (response.score > 0){
                session.send("I am not very sure if this is right...");
                session.endConversation(response.answer)
            }
            else{
                session.endConversation("I don't have an answer, please drop an email to support@support.com");
            }
        }

    }).setHeader('Ocp-Apim-Subscription-Key', process.env.SUBSCRIPTION_KEY);
};