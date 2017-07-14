import xs from 'xstream';
import { SocketWrapper } from './socket';
import { emitAction } from './commons';
import { eventClientFilter } from '../commons';

function bindEvent(id, client, wrapper, listener, name) {
    client.addEventListener(name, (e) => {
        listener.next({
            event: name,
            data: e?e.data:null,
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

                listener.next({
                    event: 'ready',
                    socket: wrapper,
                    id
                })

                /*client.on('connect', (e) => {
                    
                });*/

                bindEvent(id, client, wrapper, listener, 'connect');
                bindEvent(id, client, wrapper, listener, 'connect_error');
                bindEvent(id, client, wrapper, listener, 'connect_timeout');
                bindEvent(id, client, wrapper, listener, 'disconnect');
                bindEvent(id, client, wrapper, listener, 'reconnect_attempt');
                bindEvent(id, client, wrapper, listener, 'reconnecting');
                bindEvent(id, client, wrapper, listener, 'reconnect_error');
                bindEvent(id, client, wrapper, listener, 'reconnect_failed');
                bindEvent(id, client, wrapper, listener, 'ping');
                bindEvent(id, client, wrapper, listener, 'pong');
                bindEvent(id, client, wrapper, listener, 'message');

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
        sendAction:emitAction,
        eventFilter:eventClientFilter
    }
}