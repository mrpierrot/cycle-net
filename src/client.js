import xs from 'xstream';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import socketWrapper from './socket';

function bindEvent(instanceId, client, listener, name) {
    client.addEventListener(name, (data) => {
        listener.next({
            event: name,
            data:data,
            socket: socketWrapper(client),
            instanceId
        })
    });
}

function createClientProducer(WebSocket, instanceId, url, config) {
    let client;

    return {
        start(listener) {
            client = new WebSocket(url, config);

            client.addEventListener('error', (e) => {
                listener.error({
                    event: 'error',
                    error: e,
                    instanceId
                })
            });


            listener.next({
                event: 'ready',
                socket: socketWrapper(client),
                instanceId
            })


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
    return function createAction({ id, url, config }) {

        return xs.create(createClientProducer(WebSocket, id, url, config))
            .endWhen(stopAction$.filter(o => o.id === id))
    }
}

function sendAction({ socket, message }) {
    socket.send(message)
}

export function makeWSClientDriver(WebSocket = global.WebSocket) {

    return function makeWSClientDriver(input$) {
        const closeAction$ = input$.filter(o => o.action === 'close');
        const createAction$ = input$.filter(o => o.action === 'create')
            .map(makeCreateAction(WebSocket, closeAction$))
            .compose(flattenConcurrently);
        const sendAction$ = input$.filter(o => o.action === 'send').map(sendAction);

        sendAction$.addListener({
            next() { },
            complete() { },
            error() { }
        });

        return {
            select(instanceId) {
                return {
                    events(name) {
                        return adapt(createAction$.filter(o => o.instanceId === instanceId && o.event === name));
                    }
                }
            }
        }

    }
}