import xs from 'xstream';
import { SocketWrapper } from './socket';
import { sendAction } from './commons';
import { eventClientFilter } from '../commons';

function bindEvent(id, client, wrapper, listener, name) {
    client.addEventListener(name, (e) => {
        let data = e.data;
        if(typeof(data) === 'string'){
            try{
                data = JSON.parse(data);
            }catch(e){
                // do nothing
            }
        }
        listener.next({
            event: name,
            data: data,
            socket: wrapper,
            id
        })
    });
}

function makeProducer(clazz){
    return function(cfg) {
        let client;
        const {id, url, protocols, config} = cfg;

        return {
            start(listener) {
                client = new clazz(url, protocols, config);
                const wrapper = SocketWrapper(client);

                client.addEventListener('error', (e) => {
                    listener.error({
                        event: 'error',
                        error: e,
                        id
                    })
                });

                client.addEventListener('open', (e) => {
                    listener.next({
                        event: 'ready',
                        socket: wrapper,
                        id
                    })
                });

                bindEvent(id, client, wrapper, listener, 'open');
                bindEvent(id, client, wrapper, listener, 'close');
                bindEvent(id, client, wrapper, listener, 'headers');
                bindEvent(id, client, wrapper, listener, 'message');
                bindEvent(id, client, wrapper, listener, 'ping');
                bindEvent(id, client, wrapper, listener, 'pong');
                bindEvent(id, client, wrapper, listener, 'unexpected-response');

            },

            stop() {
                client.close();
            }
        }
    }
}


export function wsClient(clazz=global.WebSocket){
    return {
        producer: makeProducer(clazz),
        sendAction:sendAction,
        eventFilter:eventClientFilter
    }
}