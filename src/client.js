import xs from 'xstream';
import { SocketWrapper } from './socket';
import { makeDriver } from './commons';

function bindEvent(instanceId, client, wrapper, listener, name) {
    client.addEventListener(name, (data) => {
        listener.next({
            event: name,
            data: data,
            socket: wrapper,
            instanceId
        })
    });
}

function createClientProducer(WebSocket, instanceId, url, protocols, config) {
    let client;

    return {
        start(listener) {
            client = new WebSocket(url, protocols, config);
            const wrapper = SocketWrapper(client);

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
                    socket: wrapper,
                    instanceId
                })
            });

            bindEvent(instanceId, client, wrapper, listener, 'open');
            bindEvent(instanceId, client, wrapper, listener, 'close');
            bindEvent(instanceId, client, wrapper, listener, 'headers');
            bindEvent(instanceId, client, wrapper, listener, 'message');
            bindEvent(instanceId, client, wrapper, listener, 'ping');
            bindEvent(instanceId, client, wrapper, listener, 'pong');
            bindEvent(instanceId, client, wrapper, listener, 'unexpected-response');

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