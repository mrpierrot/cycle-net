import xs from 'xstream';
import { SocketWrapper } from './socket';
import { makeDriver } from './commons';

function bindEvent(instanceId, client, listener, name) {
    client.addEventListener(name, (data) => {
        listener.next({
            event: name,
            data: data,
            socket: SocketWrapper(client),
            instanceId
        })
    });
}

function createClientProducer(WebSocket, instanceId, url, protocols, config) {
    let client;

    return {
        start(listener) {
            client = new WebSocket(url, protocols, config);

            client.addEventListener('error', (e) => {
                listener.error({
                    event: 'error',
                    error: e,
                    instanceId
                })
            });

            client.addEventListener('open', (e) => {
                listener.next({
                    event: 'ready',
                    socket: SocketWrapper(client),
                    instanceId
                })
            });

            /*

            bindEvent(instanceId, client, listener, 'open');
            bindEvent(instanceId, client, listener, 'close');
            bindEvent(instanceId, client, listener, 'headers');
            bindEvent(instanceId, client, listener, 'message');
            bindEvent(instanceId, client, listener, 'ping');
            bindEvent(instanceId, client, listener, 'pong');
            bindEvent(instanceId, client, listener, 'unexpected-response');*/

        },

        stop() {
            client.terminate();
        }
    }
}

function makeCreateAction(WebSocket, stopAction$) {
    return function createAction({ id, url, protocols, config }) {
        return xs.create(createClientProducer(WebSocket, id, url, protocols, config))
            .endWhen(stopAction$.filter(o => o.id === id))
    }
}

function sendAction({ socket, message }) {
    socket.send(message)
}

export function makeWSClientDriver(WebSocket = global.WebSocket) {
    return makeDriver(WebSocket, makeCreateAction, sendAction);
}