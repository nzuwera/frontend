import {Utils} from "./utils.js";
import {socketsTopics} from "./sockets-topics.js";


const utils = new Utils();
const local_storage = utils.storage();

export const stompJs = new StompJs.Client({
            brokerURL: socketsTopics.wsUrl,
            connectHeaders: {Authorization: `Bearer ${local_storage.get('token')}`},
            debug: function (str) {
                console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });