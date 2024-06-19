const { Kafka } = require('kafkajs')
const fs = require('fs')
const axios = require('axios') 
const prismaClient = require('./prisma');


const kafka = new Kafka({
    clientId: 'my-app',
    brokers:['kafka-2238dacb-od2902-b78f.d.aivencloud.com:13154'],
    ssl : {
        rejectUnauthorized: false,
        ca : [fs.readFileSync('./ca.pem','utf-8')],
        key : fs.readFileSync('./service.key','utf-8'),
        cert : fs.readFileSync('./service.cert','utf-8'),
    },
    
});

let producer  = null;
async function createProducer() {
    if(producer) return producer;
    const _producer =  kafka.producer();
    await _producer.connect();
    producer = _producer;
    return producer;
} 


async function produceMessage(message) {
    const producer = await createProducer();
    await producer.send({
     messages : [
         {
             key : `message-${Date.now()}`,
             value : message 
         }
     ],
     topic : "MESSAGES"
    });
   
    return true;
}

function mf(){
    //console.log('md')
}

async function startMessageConsumer() {
    console.log('consumer initialiased')
    const consumer =  kafka.consumer({groupId: 'default'});
    await consumer.connect();
    await consumer.subscribe({topic: 'MESSAGES', fromBeginning:true});

    

    await consumer.run({
        autoCommit:true,
        eachMessage : async ({message,pause}) => {
            if(!message.value) return
            //console.log('New message received..',message);
            try {
                
               let bufferMsg = message.value.toString()
               const {msg, chatId, senderName, timestamp, senderid} = JSON.parse(bufferMsg)

               let chatid = chatId
               let messagetext = msg

                let userJSON = {
                    user : []
                }

                const createdMessage = await prismaClient.message.create({
                    data : {
                        chatid : chatid,
                        messagetext : messagetext,
                        senderid : senderid,
                        readby : userJSON,
                        sendername :  senderName
                    }
                })

                //console.log(createdMessage)


                // await prismaClient.message.create({
                //     data : {
                //         text : message.value?.toString(),
                //     },
                // });
                //console.log('message sent to prisma / postgres')
            } catch (error) {
                console.log('Something went wrong',error);
                pause();
                setTimeout(()=>{
                    consumer.resume([{topic: 'MESSAGES'}]);
                }, 60 * 1000);
            }
        },
    });
}

 

 
module.exports = [produceMessage,createProducer,startMessageConsumer,mf];