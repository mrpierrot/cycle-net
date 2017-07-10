import xs from 'xstream';
import { SocketWrapper } from './socket';
import { sendAction } from './commons';

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

function makeProducer(func){
    return function(cfg) {
        let client;
        const {id, url, config} = cfg;

        return {
            start(listener) {
                client = func(url, config);
                const wrapper = SocketWrapper(client);

                client.on('error', (e) => {
                    listener.error({
                        event: 'error',
                        error: e,
                        id
                    })
                });

                client.on('connect', (e) => {
                    listener.next({
                        event: 'ready',
                        socket: wrapper,
                        id
                    })
                });

           /*     bindEvent(id, client, wrapper, listener, 'open');
                bindEvent(id, client, wrapper, listener, 'close');
                bindEvent(id, client, wrapper, listener, 'headers');
                bindEvent(id, client, wrapper, listener, 'message');
                bindEvent(id, client, wrapper, listener, 'ping');
                bindEvent(id, client, wrapper, listener, 'pong');
                bindEvent(id, client, wrapper, listener, 'unexpected-response');*/

            },

            stop() {
                client.close();
            }
        }
    }
}


export function ioClient(func){
    return {
        producer: makeProducer(func),
        sendAction:sendAction
    }
}